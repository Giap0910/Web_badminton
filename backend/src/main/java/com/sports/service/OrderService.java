package com.sports.service;

import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.dto.OrderItemResponse;
import com.sports.dto.OrderResponse;
import com.sports.dto.VoucherValidateRequest;
import com.sports.dto.VoucherValidateResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.InsufficientStockException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.exception.UnauthorizedException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PayOSService payosService;
    private final VoucherService voucherService;
    private final EntityManager entityManager;

    private static final int MAX_PENDING_ORDERS_PER_USER = 3;
    private static final int ORDER_TIMEOUT_MINUTES = 15;

    @Transactional
    public OrderResponse createOrder(Long userId, OrderCreateRequest request) {
        User user = lockOrderingUser(userId);
        validateRequestedItems(request.getItems());
        Order order = buildOrder(user, request, normalizePaymentMethod(request.getPaymentMethod()));
        List<OrderItem> items = new ArrayList<>();
        for (OrderItemRequest item : request.getItems().stream()
                .sorted(Comparator.comparing(OrderItemRequest::getProductId)).toList()) {
            items.add(reserveItem(order, item));
        }
        order.setItems(items);
        calculateOrderTotal(order, request.getVoucherCode());
        Order saved = orderRepository.save(order);
        if ("PAYOS_VIETQR".equals(order.getPaymentMethod())) {
            saved.setPayosOrderCode(Math.addExact(1_000_000_000L, saved.getId()));
        }
        log.info("Tạo đơn ID={}, phương thức={}, tổng tiền={}", saved.getId(),
                saved.getPaymentMethod(), saved.getTotalAmount());
        return toDto(saved);
    }

    private User lockOrderingUser(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + userId));
        if (orderRepository.countByUserIdAndStatus(userId, OrderStatus.PENDING) >= MAX_PENDING_ORDERS_PER_USER) {
            throw new BadRequestException("Bạn đang có 3 đơn hàng chưa thanh toán hoặc chờ xử lý");
        }
        return user;
    }

    private void validateRequestedItems(List<OrderItemRequest> items) {
        if (items == null || items.isEmpty()) throw new BadRequestException("Đơn hàng phải có sản phẩm");
        java.util.Map<Long, Integer> quantities = new java.util.HashMap<>();
        for (OrderItemRequest item : items) {
            if (item == null || item.getProductId() == null || item.getQuantity() == null
                    || item.getQuantity() <= 0 || item.getQuantity() > 100) {
                throw new BadRequestException("Sản phẩm và số lượng đặt mua không hợp lệ");
            }
            int total = quantities.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            if (total > 100) throw new BadRequestException("Tổng số lượng mỗi sản phẩm tối đa là 100");
        }
    }

    private Order buildOrder(User user, OrderCreateRequest request, String paymentMethod) {
        LocalDateTime now = LocalDateTime.now();
        return Order.builder().user(user).customerName(request.getCustomerName())
                .shippingPhone(request.getShippingPhone()).shippingAddress(request.getShippingAddress())
                .totalAmount(BigDecimal.ZERO).status(OrderStatus.PENDING).paymentMethod(paymentMethod)
                .expiresAt("COD".equals(paymentMethod) ? null : now.plusMinutes(ORDER_TIMEOUT_MINUTES))
                .note(request.getNote()).createdAt(now).build();
    }

    private OrderItem reserveItem(Order order, OrderItemRequest request) {
        Product product = lockProduct(request.getProductId());
        if (product.getStock() < request.getQuantity()) {
            throw new InsufficientStockException("Sản phẩm '" + product.getName() + "' không đủ tồn kho");
        }
        if (product.getPrice() == null || product.getPrice().signum() <= 0) {
            throw new BadRequestException("Giá sản phẩm không hợp lệ");
        }
        product.setStock(product.getStock() - request.getQuantity());
        product.setReservedStock(product.getReservedStock() + request.getQuantity());
        productRepository.save(product);
        return OrderItem.builder().order(order).product(product).quantity(request.getQuantity())
                .price(product.getPrice()).selectedSize(request.getSelectedSize())
                .selectedColor(request.getSelectedColor()).selectedWeight(request.getSelectedWeight())
                .stringingService(request.getStringingService()).stringTension(request.getStringTension()).build();
    }

    private void calculateOrderTotal(Order order, String voucherCode) {
        BigDecimal subtotal = order.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingFee = subtotal.compareTo(new BigDecimal("1000000")) >= 0
                ? BigDecimal.ZERO : new BigDecimal("30000");
        BigDecimal discount = BigDecimal.ZERO;
        if (voucherCode != null && !voucherCode.isBlank()) {
            VoucherValidateResponse voucher = voucherService.reserveVoucher(
                    new VoucherValidateRequest(voucherCode.trim(), subtotal));
            discount = voucher.getDiscountAmount();
            order.setVoucherCode(voucher.getCode());
        }
        order.setDiscountAmount(discount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(subtotal.subtract(discount).add(shippingFee));
    }

    private String normalizePaymentMethod(String value) {
        String method = value == null || value.isBlank() ? "PAYOS_VIETQR" : value.trim();
        if (!"COD".equals(method) && !"PAYOS_VIETQR".equals(method)) {
            throw new BadRequestException("Phương thức thanh toán chưa được hỗ trợ");
        }
        return method;
    }

    private Order lockOrder(Long orderId) {
        return orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + orderId));
    }

    private Product lockProduct(Long productId) {
        entityManager.flush();
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm: " + productId));
        entityManager.refresh(product, LockModeType.PESSIMISTIC_WRITE);
        return product;
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long currentUserId, boolean isAdmin) {
        Order order = lockOrder(orderId);
        if (!isAdmin && !order.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("Bạn không có quyền thao tác trên đơn hàng này!");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) return toDto(order);
        cancelPendingOrder(order);
        return toDto(orderRepository.save(order));
    }

    private void cancelPendingOrder(Order order) {
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ được hủy đơn chưa thanh toán và chưa giao hàng");
        }
        settleReservedStock(order, true);
        voucherService.releaseVoucher(order.getVoucherCode());
        order.setStatus(OrderStatus.CANCELLED);
    }

    private void settleReservedStock(Order order, boolean restoreAvailable) {
        List<OrderItem> items = order.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getProduct().getId())).toList();
        for (OrderItem item : items) {
            Product product = lockProduct(item.getProduct().getId());
            if (product.getReservedStock() < item.getQuantity()) {
                throw new BadRequestException("Tồn kho giữ chỗ không khớp; cần kiểm tra trước khi xử lý đơn");
            }
            product.setReservedStock(product.getReservedStock() - item.getQuantity());
            if (restoreAvailable) product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }
    }

    @Transactional
    public boolean expireOrder(Long orderId) {
        Order order = lockOrder(orderId);
        if (order.getStatus() != OrderStatus.PENDING || !"PAYOS_VIETQR".equals(order.getPaymentMethod())
                || order.getExpiresAt() == null || order.getExpiresAt().isAfter(LocalDateTime.now())) {
            return false;
        }
        cancelPendingOrder(order);
        orderRepository.save(order);
        return true;
    }

    @Transactional
    public void handlePaymentSuccess(Long payosOrderCode, BigDecimal amount) {
        Order order = orderRepository.findByPayosOrderCodeForUpdate(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với mã PayOS"));
        validatePayment(order, amount);
        if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.SHIPPING
                || order.getStatus() == OrderStatus.COMPLETED) return;
        if (order.getStatus() != OrderStatus.PENDING || order.getExpiresAt() == null
                || !order.getExpiresAt().isAfter(LocalDateTime.now())) {
            log.warn("Thanh toán đến cho đơn đã hủy/hết hạn ID={}; cần đối soát thủ công", order.getId());
            throw new BadRequestException("Đơn đã hủy hoặc hết hạn; cần đối soát thanh toán thủ công");
        }
        settleReservedStock(order, false);
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
    }

    private void validatePayment(Order order, BigDecimal amount) {
        if (!"PAYOS_VIETQR".equals(order.getPaymentMethod())) {
            throw new BadRequestException("Đơn hàng không sử dụng PayOS");
        }
        if (amount == null || amount.signum() < 0 || order.getTotalAmount().compareTo(amount) != 0) {
            throw new BadRequestException("Số tiền thanh toán không khớp với đơn hàng!");
        }
    }

    /**
     * Get order details with strict Anti-IDOR protection.
     */
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId, Long currentUserId, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Anti-IDOR check
        if (!isAdmin && !order.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("Bạn không có quyền truy cập vào đơn hàng này!");
        }

        return toDto(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = lockOrder(orderId);
        if (newStatus == order.getStatus()) return toDto(order);
        if (newStatus == OrderStatus.CANCELLED) {
            cancelPendingOrder(order);
        } else if (newStatus == OrderStatus.SHIPPING && canShip(order)) {
            if ("COD".equals(order.getPaymentMethod())) settleReservedStock(order, false);
            order.setStatus(newStatus);
        } else if (newStatus == OrderStatus.COMPLETED && order.getStatus() == OrderStatus.SHIPPING) {
            order.setStatus(newStatus);
        } else {
            throw new BadRequestException("Không được chuyển trạng thái đơn hàng theo luồng này");
        }
        return toDto(orderRepository.save(order));
    }

    private boolean canShip(Order order) {
        return ("COD".equals(order.getPaymentMethod()) && order.getStatus() == OrderStatus.PENDING)
                || ("PAYOS_VIETQR".equals(order.getPaymentMethod()) && order.getStatus() == OrderStatus.PAID);
    }

    private OrderResponse toDto(Order order) {
        long secondsRemaining = 0;
        if (order.getStatus() == OrderStatus.PENDING && order.getExpiresAt() != null) {
            Duration duration = Duration.between(LocalDateTime.now(), order.getExpiresAt());
            secondsRemaining = Math.max(0, duration.getSeconds());
        }

        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> {
                    BigDecimal price = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                    int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                    return OrderItemResponse.builder()
                            .id(item.getId())
                            .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                            .productName(item.getProduct() != null ? item.getProduct().getName() : "")
                            .productBrand(item.getProduct() != null ? item.getProduct().getBrand() : "")
                            .productImageUrl(item.getProduct() != null ? item.getProduct().getImageUrl() : "")
                            .weightGrip(item.getProduct() != null ? item.getProduct().getWeightGrip() : "")
                            .selectedSize(item.getSelectedSize())
                            .selectedColor(item.getSelectedColor())
                            .selectedWeight(item.getSelectedWeight())
                            .stringingService(item.getStringingService())
                            .stringTension(item.getStringTension())
                            .quantity(qty)
                            .price(price)
                            .subtotal(price.multiply(BigDecimal.valueOf(qty)))
                            .build();
                })
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .customerName(order.getCustomerName())
                .shippingPhone(order.getShippingPhone())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
                .shippingFee(order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO)
                .voucherCode(order.getVoucherCode())
                .discountAmount(order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO)
                .note(order.getNote())
                .status(order.getStatus().name())
                .paymentMethod(order.getPaymentMethod())
                .payosOrderCode(order.getPayosOrderCode())
                .expiresAt(order.getExpiresAt())
                .timeRemainingSeconds(secondsRemaining)
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}
