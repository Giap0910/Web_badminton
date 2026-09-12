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

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
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

    private static final int MAX_PENDING_ORDERS_PER_USER = 3;
    private static final int ORDER_TIMEOUT_MINUTES = 15;

    /**
     * Creates an order with Atomic Stock Reservation (Pessimistic Locking).
     */
    @Transactional
    public OrderResponse createOrder(Long userId, OrderCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        // 1. Anti-Denial of Inventory: Limit active PENDING orders per user
        int activePendingOrders = orderRepository.countByUserIdAndStatus(userId, OrderStatus.PENDING);
        if (activePendingOrders >= MAX_PENDING_ORDERS_PER_USER) {
            throw new BadRequestException("Bạn đang có " + activePendingOrders + " đơn hàng chưa thanh toán. Vui lòng thanh toán hoặc hủy đơn cũ trước khi tạo thêm đơn mới!");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(ORDER_TIMEOUT_MINUTES);

        // Generate unique 6-8 digit numeric order code for PayOS
        long payosOrderCode = System.currentTimeMillis() % 100000000L;

        String paymentMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank())
                ? request.getPaymentMethod().trim()
                : "PAYOS_VIETQR";

        Order order = Order.builder()
                .user(user)
                .customerName(request.getCustomerName())
                .shippingPhone(request.getShippingPhone())
                .shippingAddress(request.getShippingAddress())
                .totalAmount(BigDecimal.ZERO)
                .status(OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .payosOrderCode(payosOrderCode)
                .expiresAt(expiresAt)
                .note(request.getNote())
                .createdAt(now)
                .build();

        // 2. Atomic Stock Reservation with Pessimistic Locking
        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new BadRequestException("Số lượng đặt mua phải lớn hơn 0");
            }
            if (itemReq.getQuantity() > 100) {
                throw new BadRequestException("Số lượng đặt mua tối đa cho mỗi mặt hàng là 100");
            }

            // Pessimistic Lock on product row
            Product product = productRepository.findByIdForUpdate(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + itemReq.getProductId()));

            // Stock check
            if (product.getStock() < itemReq.getQuantity()) {
                throw new InsufficientStockException("Sản phẩm '" + product.getName() + "' chỉ còn " + product.getStock() + " chiếc trong kho. Không đủ số lượng bạn yêu cầu (" + itemReq.getQuantity() + ")!");
            }

            // Atomic shift: stock -> reservedStock
            product.setStock(product.getStock() - itemReq.getQuantity());
            product.setReservedStock(product.getReservedStock() + itemReq.getQuantity());
            productRepository.save(product);

            BigDecimal itemSubtotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemSubtotal);

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .price(product.getPrice())
                    .build();

            orderItems.add(orderItem);
        }

        // Voucher application
        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedVoucherCode = null;
        if (request.getVoucherCode() != null && !request.getVoucherCode().isBlank()) {
            try {
                VoucherValidateResponse val = voucherService.validateVoucher(
                        new VoucherValidateRequest(request.getVoucherCode().trim(), totalAmount));
                discountAmount = val.getDiscountAmount();
                totalAmount = val.getFinalTotal();
                appliedVoucherCode = val.getCode();
                voucherService.incrementUsedCount(appliedVoucherCode);
            } catch (Exception e) {
                log.warn("Không thể áp dụng voucher '{}': {}", request.getVoucherCode(), e.getMessage());
            }
        }

        order.setTotalAmount(totalAmount);
        order.setDiscountAmount(discountAmount);
        order.setVoucherCode(appliedVoucherCode);
        order.setItems(orderItems);

        Order savedOrder = orderRepository.save(order);
        log.info("Tạo đơn hàng thành công ID={}, PayOS Code={}, Tổng tiền={}, Giảm giá={}, Khóa tạm {} sản phẩm",
                savedOrder.getId(), payosOrderCode, totalAmount, discountAmount, orderItems.size());

        return toDto(savedOrder);
    }

    /**
     * User actively cancels an order before expiration -> Immediately release reserved stock.
     */
    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long currentUserId, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Anti-IDOR: verify ownership
        if (!isAdmin && !order.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("Bạn không có quyền thao tác trên đơn hàng này!");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ thanh toán (PENDING)");
        }

        // Return reserved_stock back to available stock
        for (OrderItem item : order.getItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElse(item.getProduct());
            product.setStock(product.getStock() + item.getQuantity());
            product.setReservedStock(Math.max(0, product.getReservedStock() - item.getQuantity()));
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order updated = orderRepository.save(order);
        log.info("Hủy đơn hàng ID={}, Đã hoàn trả lại số lượng tồn kho thành công", orderId);
        return toDto(updated);
    }

    /**
     * Handles PayOS Webhook successful payment confirmation:
     * Validates amount (anti-Parameter Tampering), converts status to PAID, permanently clears reserved_stock.
     */
    @Transactional
    public void handlePaymentSuccess(Long payosOrderCode, BigDecimal amount) {
        Order order = orderRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với mã PayOS: " + payosOrderCode));

        // Parameter Tampering Check: Verify totalAmount matches exactly
        if (order.getTotalAmount().compareTo(amount) != 0) {
            log.error("CẢNH BÁO BẢO MẬT: Phát hiện sai lệch số tiền thanh toán! DB={}, Webhook={}", order.getTotalAmount(), amount);
            throw new BadRequestException("Số tiền thanh toán không khớp với đơn hàng!");
        }

        if (order.getStatus() == OrderStatus.PAID) {
            log.info("Đơn hàng PayOS Code={} đã được ghi nhận thanh toán trước đó", payosOrderCode);
            return;
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            log.warn("Đơn hàng PayOS Code={} không ở trạng thái PENDING (Hiện tại: {})", payosOrderCode, order.getStatus());
            return;
        }

        // Permanently deduct reserved_stock
        for (OrderItem item : order.getItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElse(item.getProduct());
            product.setReservedStock(Math.max(0, product.getReservedStock() - item.getQuantity()));
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        log.info("Thanh toán thành công đơn hàng ID={}, PayOS Code={}, Đã trừ đứt reserved_stock", order.getId(), payosOrderCode);
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
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));
        order.setStatus(newStatus);
        return toDto(orderRepository.save(order));
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
                            .quantity(qty)
                            .price(price)
                            .subtotal(price.multiply(BigDecimal.valueOf(qty)))
                            .build();
                })
                .collect(Collectors.toList());

        // VietQR Dynamic generation link
        String bankBin = "970422"; // MBBank
        String accountNo = "0987654321";
        String accountName = "SHOP BADMINTON AI";
        String memo = "BADMINTON " + order.getPayosOrderCode();

        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
        String encodedMemo = URLEncoder.encode(memo, StandardCharsets.UTF_8);
        long totalLong = order.getTotalAmount() != null ? order.getTotalAmount().longValue() : 0L;
        String vietQrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                bankBin, accountNo, totalLong, encodedMemo, encodedAccountName);

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .customerName(order.getCustomerName())
                .shippingPhone(order.getShippingPhone())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
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
                .accountNo(accountNo)
                .accountName(accountName)
                .bin(bankBin)
                .qrCode(vietQrUrl)
                .checkoutUrl(vietQrUrl)
                .build();
    }
}
