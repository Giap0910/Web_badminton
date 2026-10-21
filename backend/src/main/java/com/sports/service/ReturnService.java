package com.sports.service;

import com.sports.dto.ReturnCreateRequest;
import com.sports.dto.ReturnResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.exception.UnauthorizedException;
import com.sports.repository.*;
import com.sports.security.HtmlSanitizerUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReturnService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final ProductRepository productRepository;
    private final ReturnEvidenceStorage evidenceStorage;
    private final PaymentLedgerService paymentLedgerService;

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ReturnResponse createReturnRequest(Long userId, ReturnCreateRequest request) {
        validateCreate(request);
        Order order=lockedOrder(request.getOrderId());
        requireOwner(order,userId);
        User user=userRepository.findById(userId).orElseThrow(() -> missing("người dùng",userId));
        OrderItem item=selectedItem(order,request.getOrderItemId());
        int quantity=request.getQuantity()==null ? 1 : request.getQuantity();
        String reason=cleanText(request.getReason(),2000,true);
        String serial=cleanText(request.getSerialNumber(),100,false);
        List<ReturnRequest> requests=returnRequestRepository.findByOrderIdForUpdate(order.getId());
        ReturnRequest replay=replayActive(requests,item,quantity,reason,serial);
        if (replay!=null) return response(replay,true);
        String issue=eligibilityIssue(order,item,requests,LocalDateTime.now());
        if (issue!=null) throw new BadRequestException(issue);
        if (quantity>remaining(item,requests)) throw new BadRequestException("Số lượng vượt phần bảo hành còn lại");
        ReturnRequest created=ReturnRequest.builder().user(user).order(order).orderItem(item).quantity(quantity)
                .reason(reason).serialNumber(serial).originalVariantId(variantId(item)).status(ReturnStatus.PENDING).build();
        return response(returnRequestRepository.saveAndFlush(created),false);
    }

    private void validateCreate(ReturnCreateRequest request) {
        if (request.getOrderId()==null || request.getOrderId()<1) throw new BadRequestException("Mã đơn hàng không hợp lệ");
        if (request.getQuantity()!=null && (request.getQuantity()<1 || request.getQuantity()>100))
            throw new BadRequestException("Số lượng phải từ 1 đến 100");
        if (request.getImageUrl()!=null && !request.getImageUrl().isBlank())
            throw new BadRequestException("Hãy tải ảnh qua chức năng ảnh bằng chứng của yêu cầu, không dùng URL ngoài");
    }

    private String cleanText(String value,int limit,boolean required) {
        if (value!=null && value.length()>limit) throw new BadRequestException("Nội dung vượt giới hạn "+limit+" ký tự");
        String clean=value==null ? null : HtmlSanitizerUtil.sanitizeToPlainText(value);
        clean=clean==null || clean.isBlank() ? null : clean.trim();
        if (required && clean==null) throw new BadRequestException("Vui lòng mô tả lỗi sản phẩm");
        return clean;
    }

    private ResourceNotFoundException missing(String type,Long id) {
        return new ResourceNotFoundException("Không tìm thấy "+type+" với ID: "+id);
    }

    private Order lockedOrder(Long id) {
        return orderRepository.findByIdForUpdate(id).orElseThrow(() -> missing("đơn hàng",id));
    }

    private void requireOwner(Order order,Long userId) {
        if (order.getUser()==null || !Objects.equals(order.getUser().getId(),userId))
            throw new UnauthorizedException("Bạn chỉ có thể xem và gửi bảo hành cho đơn hàng của mình");
    }

    private OrderItem selectedItem(Order order,Long itemId) {
        if (itemId==null) {
            if (order.getItems().size()!=1) throw new BadRequestException("Hãy chọn dòng sản phẩm cần bảo hành");
            return order.getItems().get(0);
        }
        return order.getItems().stream().filter(item -> Objects.equals(item.getId(),itemId)).findFirst()
                .orElseThrow(() -> new BadRequestException("Dòng sản phẩm không thuộc đơn hàng"));
    }

    private boolean active(ReturnRequest request) {
        return request.getStatus()==ReturnStatus.PENDING || request.getStatus()==ReturnStatus.APPROVED;
    }

    private boolean sameItem(ReturnRequest request,OrderItem item) {
        return request.getOrderItem()!=null && Objects.equals(request.getOrderItem().getId(),item.getId());
    }

    private ReturnRequest replayActive(List<ReturnRequest> requests,OrderItem item,int quantity,String reason,String serial) {
        ReturnRequest existing=requests.stream().filter(request -> sameItem(request,item) && active(request)).findFirst().orElse(null);
        if (existing==null) return null;
        if (Objects.equals(existing.getQuantity(),quantity) && Objects.equals(existing.getReason(),reason)
                && Objects.equals(existing.getSerialNumber(),serial)) return existing;
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Dòng sản phẩm đã có yêu cầu #"+existing.getId()+" đang được xử lý");
    }

    private int claimed(OrderItem item,List<ReturnRequest> requests) {
        return requests.stream().filter(request -> sameItem(request,item) && request.getStatus()!=ReturnStatus.REJECTED)
                .mapToInt(request -> request.getQuantity()==null ? 1 : request.getQuantity()).reduce(0,Math::addExact);
    }

    private int remaining(OrderItem item,List<ReturnRequest> requests) {
        return Math.max(0,item.getQuantity()-claimed(item,requests));
    }

    private LocalDateTime deadline(Order order) {
        return order.getCompletedAt()==null ? null : order.getCompletedAt().plusDays(90);
    }

    private boolean paid(Order order) {
        PaymentAttempt attempt=paymentAttemptRepository.findByOrderId(order.getId()).orElse(null);
        if (paymentAttemptRepository.findByOrderIdOrderByIdAsc(order.getId()).stream()
                .anyMatch(old -> !java.util.Objects.equals(old.getId(), attempt == null ? null : attempt.getId())
                        && conflictingCodPayment(old))) return false;
        if ("COD".equals(order.getPaymentMethod())) return order.getCashCollectedAt()!=null && !conflictingCodPayment(attempt);
        if (!"PAYOS_VIETQR".equals(order.getPaymentMethod())) return false;
        return attempt!=null && attempt.getStatus()==PaymentAttempt.Status.PAID && "PAYOS".equals(attempt.getProvider())
                && attempt.getPaidAt()!=null && attempt.getAmount()!=null && order.getTotalAmount()!=null
                && attempt.getAmount().compareTo(order.getTotalAmount())==0 && !paymentLedgerService.hasHardConflict(attempt.getId());
    }

    private boolean conflictingCodPayment(PaymentAttempt attempt) {
        return attempt!=null && (attempt.getStatus()==PaymentAttempt.Status.PAID || attempt.getStatus()==PaymentAttempt.Status.NEEDS_REVIEW
                || paymentLedgerService.hasHardConflict(attempt.getId()) || paymentLedgerService.received(attempt.getId()).stream()
                .anyMatch(event -> event.getAmount()!=null && event.getAmount().signum()>0));
    }

    private String eligibilityIssue(Order order,OrderItem item,List<ReturnRequest> requests,LocalDateTime at) {
        if (order.getStatus()!=OrderStatus.COMPLETED) return "Đơn hàng chưa giao hoàn tất";
        if (order.getCompletedAt()==null) return "Đơn cũ chưa có ngày giao hoàn tất để xác minh thời hạn bảo hành";
        if (order.getCompletedAt().isAfter(at)) return "Ngày giao hoàn tất chưa hợp lệ";
        if (!paid(order)) return "Đơn hàng chưa có bằng chứng thanh toán đã được xác nhận";
        if (at.isAfter(deadline(order))) return "Đã hết thời hạn bảo hành 90 ngày";
        Long category=item.getCategoryIdSnapshot();
        if (category==null) return "Đơn cũ chưa có danh mục đã xác minh cho dòng sản phẩm";
        if (category<1 || category>4) return "Phụ kiện không thuộc ưu đãi bảo hành 1 đổi 1";
        if (requests.stream().anyMatch(request -> request.getOrderItem()==null && request.getStatus()!=ReturnStatus.REJECTED))
            return "Đơn có yêu cầu cũ chưa xác định dòng sản phẩm, cần quản trị viên đối soát";
        if (remaining(item,requests)<1) return "Đã dùng hết số lượng được bảo hành";
        return null;
    }

    @Transactional(readOnly=true)
    public List<ReturnResponse.EligibleItem> getEligibleItems(Long userId,Long orderId) {
        List<Order> orders;
        if (orderId!=null) {
            Order order=orderRepository.findById(orderId).orElseThrow(() -> missing("đơn hàng",orderId));
            requireOwner(order,userId);
            orders=List.of(order);
        } else orders=orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(order -> order.getStatus()==OrderStatus.COMPLETED).toList();
        return orders.stream().flatMap(order -> {
            List<ReturnRequest> requests=returnRequestRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
            return order.getItems().stream().map(item -> eligibleItem(order,item,requests));
        }).toList();
    }

    private ReturnResponse.EligibleItem eligibleItem(Order order,OrderItem item,List<ReturnRequest> requests) {
        Long activeId=requests.stream().filter(request -> sameItem(request,item) && active(request))
                .map(ReturnRequest::getId).findFirst().orElse(null);
        String issue=eligibilityIssue(order,item,requests,LocalDateTime.now());
        if (issue==null && activeId!=null) issue="Đã có yêu cầu #"+activeId+" đang được xử lý";
        return new ReturnResponse.EligibleItem(order.getId(),item.getId(),productId(item),item.getProduct()==null,
                productName(item),productSku(item),productBrand(item),item.getCategoryIdSnapshot(),variantId(item),
                item.getSelectedSize(),item.getSelectedColor(),item.getSelectedWeight(),item.getQuantity(),
                claimed(item,requests),remaining(item,requests),activeId,deadline(order),issue==null,issue);
    }

    @Transactional(readOnly=true)
    public List<ReturnResponse> getUserReturnRequests(Long userId) {
        return returnRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly=true)
    public List<ReturnResponse> getAllReturnRequests() {
        return returnRequestRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    private ReturnRequest lockedRequest(Long requestId) {
        Long orderId=returnRequestRepository.findOrderIdByRequestId(requestId).orElseThrow(() -> missing("yêu cầu bảo hành",requestId));
        lockedOrder(orderId);
        return returnRequestRepository.findByIdForUpdate(requestId).orElseThrow(() -> missing("yêu cầu bảo hành",requestId));
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ReturnResponse updateStatus(Long requestId,ReturnStatus status,String adminNote) {
        return updateStatus(requestId,status,adminNote,null);
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ReturnResponse updateStatus(Long requestId,ReturnStatus status,String adminNote,Long replacementVariantId) {
        ReturnRequest request=lockedRequest(requestId);
        String note=cleanText(adminNote,2000,false);
        if (request.getStatus()==status) {
            if (status==ReturnStatus.COMPLETED && replacementVariantId!=null
                    && !Objects.equals(request.getReplacementVariantId(),replacementVariantId))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Yêu cầu đã hoàn tất với biến thể khác");
            return response(request,true);
        }
        requireTransition(request,status);
        if (status==ReturnStatus.APPROVED) requireOriginalEligibility(request);
        if (status==ReturnStatus.COMPLETED) completeExchange(request,replacementVariantId,note);
        if (adminNote!=null) request.setAdminNote(note);
        request.setStatus(status);
        return response(returnRequestRepository.saveAndFlush(request),false);
    }

    private void requireTransition(ReturnRequest request,ReturnStatus status) {
        boolean valid=request.getStatus()==ReturnStatus.PENDING && (status==ReturnStatus.APPROVED || status==ReturnStatus.REJECTED)
                || request.getStatus()==ReturnStatus.APPROVED && (status==ReturnStatus.COMPLETED || status==ReturnStatus.REJECTED);
        if (!valid) throw new BadRequestException("Không thể chuyển trạng thái "+request.getStatus()+" sang "+status);
        if (request.getOrderItem()==null) throw new BadRequestException("Yêu cầu cũ chưa xác định dòng sản phẩm, cần đối soát");
    }

    private void requireOriginalEligibility(ReturnRequest request) {
        LocalDateTime submitted=request.getCreatedAt()==null ? LocalDateTime.now() : request.getCreatedAt();
        String issue=eligibilityIssue(request.getOrder(),request.getOrderItem(),List.of(),submitted);
        if (issue!=null) throw new BadRequestException(issue);
        if (request.getQuantity()==null || request.getQuantity()<1 || request.getQuantity()>request.getOrderItem().getQuantity())
            throw new BadRequestException("Số lượng bảo hành không khớp dòng đơn hàng");
    }

    private void completeExchange(ReturnRequest request,Long variantId,String note) {
        requireOriginalEligibility(request);
        if (variantId==null) throw new BadRequestException("Hãy chọn biến thể giao đổi cho khách");
        Product product=productRepository.findByVariantIdForUpdate(variantId)
                .orElseThrow(() -> missing("biến thể giao đổi",variantId));
        entityManager.refresh(product,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        ProductVariant variant=product.getVariants().stream().filter(value -> Objects.equals(value.getId(),variantId)).findFirst()
                .orElseThrow(() -> missing("biến thể giao đổi",variantId));
        requireReplacement(request,product,variant,note);
        ProductVariantService.reserve(variant,request.getQuantity());
        ProductVariantService.settle(variant,request.getQuantity(),false);
        ProductVariantService.refreshTotals(product);
        productRepository.saveAndFlush(product);
        captureReplacement(request,product,variant);
        request.setCompletedAt(LocalDateTime.now());
    }

    private void requireReplacement(ReturnRequest request,Product product,ProductVariant variant,String note) {
        if (!Boolean.TRUE.equals(product.getCatalogVisible()) || !ProductBrand.isSupported(product.getBrand())
                || !Boolean.TRUE.equals(variant.getActive()) || Boolean.TRUE.equals(variant.getLegacy()))
            throw new BadRequestException("Biến thể giao đổi phải đang bán và hoạt động");
        Long category=product.getCategory()==null ? null : product.getCategory().getId();
        if (!Objects.equals(category,request.getOrderItem().getCategoryIdSnapshot())
                || !Objects.equals(ProductBrand.canonicalName(product.getBrand()),ProductBrand.canonicalName(productBrand(request.getOrderItem()))))
            throw new BadRequestException("Hàng giao đổi phải cùng hãng và cùng danh mục với sản phẩm đã mua");
        if (!Objects.equals(variant.getId(),request.getOriginalVariantId()) && note==null)
            throw new BadRequestException("Biến thể khác hàng đã mua cần ghi nhận khách đồng ý trong ghi chú");
    }

    private void captureReplacement(ReturnRequest request,Product product,ProductVariant variant) {
        request.setReplacementVariantId(variant.getId());
        request.setReplacementProductId(product.getId());
        request.setReplacementSku(variant.getSku());
        request.setReplacementProductName(product.getName());
        request.setReplacementColor(variant.getColor());
        request.setReplacementSize(variant.getSize());
        request.setReplacementWeightGrip(variant.getWeightGrip());
        request.setReplacementPackaging(variant.getPackaging());
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ReturnResponse uploadEvidence(Long userId,Long requestId,MultipartFile file) {
        ReturnRequest request=lockedRequest(requestId);
        requireEvidenceAccess(request,userId);
        if (request.getStatus()!=ReturnStatus.PENDING) throw new BadRequestException("Ảnh bằng chứng chỉ được cập nhật khi yêu cầu đang chờ xử lý");
        request.setEvidenceKey(evidenceStorage.store(file));
        return response(returnRequestRepository.saveAndFlush(request),false);
    }

    @Transactional(readOnly=true)
    public Path getEvidence(Long userId,Long requestId) {
        ReturnRequest request=returnRequestRepository.findById(requestId).orElseThrow(() -> missing("yêu cầu bảo hành",requestId));
        requireEvidenceAccess(request,userId);
        return evidenceStorage.read(request.getEvidenceKey());
    }

    private void requireEvidenceAccess(ReturnRequest request,Long userId) {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        boolean admin=authentication!=null && authentication.isAuthenticated() && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!admin && !Objects.equals(request.getUser().getId(),userId))
            throw new UnauthorizedException("Bạn không có quyền truy cập ảnh bằng chứng của yêu cầu này");
    }

    private Long variantId(OrderItem item) {
        return item.getVariant()==null ? null : item.getVariant().getId();
    }

    private Long productId(OrderItem item) {
        return item.getProductIdSnapshot()!=null ? item.getProductIdSnapshot() : item.getProduct()==null ? null : item.getProduct().getId();
    }

    private String productName(OrderItem item) {
        return item.getProductNameSnapshot()!=null ? item.getProductNameSnapshot() : item.getProduct()==null ? null : item.getProduct().getName();
    }

    private String productSku(OrderItem item) {
        return item.getProductSkuSnapshot()!=null ? item.getProductSkuSnapshot() : item.getProduct()==null ? null : item.getProduct().getSku();
    }

    private String productBrand(OrderItem item) {
        return item.getProductBrandSnapshot()!=null ? item.getProductBrandSnapshot() : item.getProduct()==null ? null : item.getProduct().getBrand();
    }

    private ReturnResponse response(ReturnRequest request,boolean replayed) {
        ReturnResponse response=toDto(request);
        response.setReplayed(replayed);
        return response;
    }

    private ReturnResponse toDto(ReturnRequest request) {
        boolean evidence=request.getEvidenceKey()!=null;
        ReturnResponse dto=ReturnResponse.builder().id(request.getId()).orderId(request.getOrder().getId())
                .userId(request.getUser().getId()).userFullName(request.getUser().getFullName()).reason(request.getReason())
                .imageUrl(evidence ? "/api/returns/"+request.getId()+"/evidence" : null).status(request.getStatus().name())
                .adminNote(request.getAdminNote()).createdAt(request.getCreatedAt()).quantity(request.getQuantity())
                .serialNumber(request.getSerialNumber()).originalVariantId(request.getOriginalVariantId())
                .customerPhone(request.getOrder().getShippingPhone()).orderCompletedAt(request.getOrder().getCompletedAt())
                .warrantyDeadline(deadline(request.getOrder())).completedAt(request.getCompletedAt())
                .evidenceAvailable(evidence).replayed(false).build();
        addPurchasedItem(dto,request.getOrderItem());
        addReplacement(dto,request);
        return dto;
    }

    private void addPurchasedItem(ReturnResponse dto,OrderItem item) {
        if (item==null) return;
        dto.setOrderItemId(item.getId());
        dto.setProductIdSnapshot(productId(item));
        dto.setCategoryIdSnapshot(item.getCategoryIdSnapshot());
        dto.setBrandSnapshot(productBrand(item));
        dto.setProductName(productName(item));
        dto.setProductSku(productSku(item));
        dto.setProductDeleted(item.getProduct()==null);
        dto.setSelectedSize(item.getSelectedSize());
        dto.setSelectedColor(item.getSelectedColor());
        dto.setSelectedWeight(item.getSelectedWeight());
    }

    private void addReplacement(ReturnResponse dto,ReturnRequest request) {
        dto.setReplacementVariantId(request.getReplacementVariantId());
        dto.setReplacementProductId(request.getReplacementProductId());
        dto.setReplacementSku(request.getReplacementSku());
        dto.setReplacementProductName(request.getReplacementProductName());
        dto.setReplacementColor(request.getReplacementColor());
        dto.setReplacementSize(request.getReplacementSize());
        dto.setReplacementWeightGrip(request.getReplacementWeightGrip());
        dto.setReplacementPackaging(request.getReplacementPackaging());
    }
}
