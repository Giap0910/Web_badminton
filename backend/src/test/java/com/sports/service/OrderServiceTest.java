package com.sports.service;

import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.dto.OrderResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.InsufficientStockException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PayOSService payosService;

    @Mock
    private VoucherService voucherService;

    @Mock
    private jakarta.persistence.EntityManager entityManager;

    @InjectMocks
    private OrderService orderService;

    private User mockUser;
    private Product mockProduct;

    private Order pendingOrder(String method) {
        mockProduct.setStock(3);
        mockProduct.setReservedStock(2);
        OrderItem item = OrderItem.builder().product(mockProduct).quantity(2)
                .price(mockProduct.getPrice()).build();
        return Order.builder().id(99L).user(mockUser).status(OrderStatus.PENDING)
                .paymentMethod(method).payosOrderCode(1000000099L).voucherCode("SALE")
                .totalAmount(new BigDecimal("8500000"))
                .expiresAt(java.time.LocalDateTime.now().plusMinutes(15))
                .items(Collections.singletonList(item)).build();
    }

    @Test
    void unratedProductsDoNotReceiveFiveStars() {
        var reviews = mock(com.sports.repository.ReviewRepository.class);
        var service = new ReviewService(reviews, productRepository, userRepository);
        when(reviews.findByProductIdOrderByCreatedAtDesc(10L)).thenReturn(java.util.List.of());
        assertEquals(0.0, service.getAverageRating(10L));
        when(reviews.findByProductIdOrderByCreatedAtDesc(10L)).thenReturn(java.util.List.of(
                Review.builder().rating(3).build(), Review.builder().rating(5).build()));
        assertEquals(4.0, service.getAverageRating(10L));
    }

    @Test
    void productEditPreservesOmittedDetails() {
        mockProduct.setDescription("Original description");
        mockProduct.setWeightGrip("3U-G5");
        mockProduct.setStiffness("Stiff");
        mockProduct.setBalancePoint("Head-Heavy");
        mockProduct.setPlayStyle("Attack");
        allowStockUpdate();
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));
        var dto = com.sports.dto.ProductDto.builder().price(mockProduct.getPrice()).build();
        var result = productServiceForTest().updateProduct(10L, dto);
        assertEquals("Original description", result.getDescription());
        assertEquals("3U-G5", result.getWeightGrip());
        assertEquals("Stiff", result.getStiffness());
        assertEquals("Head-Heavy", result.getBalancePoint());
        assertEquals("Attack", result.getPlayStyle());
    }

    @Test
    void invalidProductInputIsRejected() {
        var dto = com.sports.dto.ProductDto.builder().name(" ")
                .price(BigDecimal.TEN).build();
        assertThrows(BadRequestException.class, () -> productServiceForTest().updateProduct(10L, dto));
        dto.setName("Valid");
        dto.setOriginalPrice(BigDecimal.ONE);
        assertThrows(BadRequestException.class, () -> productServiceForTest().updateProduct(10L, dto));
        verifyNoInteractions(productRepository);
    }

    @Test
    void productDtoRejectsBlankNamesAndOversizedValues() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var dto = com.sports.dto.ProductDto.builder().name(" ").brand("Brand")
                    .price(new BigDecimal("10000000000")).stock(-1).build();
            var errors = factory.getValidator().validate(dto);
            assertTrue(errors.stream().anyMatch(e -> e.getPropertyPath().toString().equals("name")));
            assertTrue(errors.stream().anyMatch(e -> e.getPropertyPath().toString().equals("price")));
            assertTrue(errors.stream().anyMatch(e -> e.getPropertyPath().toString().equals("stock")));
        }
    }

    private ProductService productServiceForTest() {
        return new ProductService(productRepository, mock(com.sports.repository.CategoryRepository.class),
                mock(ReviewService.class), mock(com.sports.repository.ProductImageRepository.class));
    }

    @Test
    void staleAdminStockSnapshotCannotOverwriteReservations() {
        var dto = com.sports.dto.ProductDto.builder().price(mockProduct.getPrice())
                .stock(9).expectedStock(6).build();
        allowStockUpdate();
        assertThrows(BadRequestException.class, () -> productServiceForTest().updateProduct(10L, dto));
        assertEquals(5, mockProduct.getStock());
        verify(productRepository, never()).save(any());
    }

    @Test
    void adminStockUpdateWithCurrentSnapshotPreservesReservedStock() {
        var dto = com.sports.dto.ProductDto.builder().price(mockProduct.getPrice())
                .name(mockProduct.getName()).stock(7).expectedStock(5).build();
        mockProduct.setReservedStock(2);
        allowStockUpdate();
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var response = productServiceForTest().updateProduct(10L, dto);
        assertEquals(7, response.getStock());
        assertEquals(2, response.getReservedStock());
    }

    @Test
    void negativeStockIsRejectedBeforeDatabaseWrite() {
        var dto = com.sports.dto.ProductDto.builder().price(mockProduct.getPrice()).stock(-1).build();
        assertThrows(BadRequestException.class, () -> productServiceForTest().updateProduct(10L, dto));
        verifyNoInteractions(productRepository);
    }

    @Test
    void aggregateQuantityLimitCannotBeBypassedWithMultipleLines() {
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockUser));
        OrderCreateRequest request = new OrderCreateRequest();
        request.setItems(java.util.List.of(new OrderItemRequest(10L, 50), new OrderItemRequest(10L, 51)));
        assertThrows(BadRequestException.class, () -> orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        verifyNoInteractions(productRepository);
    }

    @Test
    void dashboardUsesRecognizedPaymentsAfterOrderProgresses() {
        Order order = pendingOrder("PAYOS_VIETQR");
        order.setStatus(OrderStatus.SHIPPING);
        when(orderRepository.findRecognizedPaymentOrders()).thenReturn(java.util.List.of(order));
        var service = new AdminDashboardService(orderRepository, productRepository, userRepository, orderService);
        var stats = service.getDashboardStats();
        assertEquals(1L, stats.getPaidOrders());
        assertEquals(0, order.getTotalAmount().compareTo(stats.getTotalRevenue()));
    }

    private void lockExisting(Order order) {
        when(orderRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(order));
    }

    private void allowStockUpdate() {
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
    }

    @Test
    void codHasNoPaymentExpiryOrPayosCode() {
        OrderCreateRequest request = prepareOrder("500000");
        request.setPaymentMethod("COD");
        allowOrderSave(true);
        OrderResponse response = orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
        assertNull(response.getExpiresAt());
        assertNull(response.getPayosOrderCode());
        assertEquals("PENDING", response.getStatus());
    }

    @Test
    void repeatedCancellationRestoresStockAndVoucherOnce() {
        Order order = pendingOrder("COD");
        lockExisting(order);
        allowStockUpdate();
        allowOrderSave(false);
        orderService.cancelOrder(99L, 1L, false);
        orderService.cancelOrder(99L, 1L, false);
        assertEquals(5, mockProduct.getStock());
        assertEquals(0, mockProduct.getReservedStock());
        verify(productRepository, times(1)).save(mockProduct);
        verify(voucherService, times(1)).releaseVoucher("SALE");
    }

    @Test
    void schedulerDoesNotExpireLegacyCod() {
        Order order = pendingOrder("COD");
        order.setExpiresAt(java.time.LocalDateTime.now().minusHours(1));
        lockExisting(order);
        assertFalse(orderService.expireOrder(99L));
        assertEquals(OrderStatus.PENDING, order.getStatus());
        verifyNoInteractions(productRepository, voucherService);
    }

    @Test
    void expiredPayosRestoresStockAndVoucherOnce() {
        Order order = pendingOrder("PAYOS_VIETQR");
        order.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        lockExisting(order);
        allowStockUpdate();
        allowOrderSave(false);
        assertTrue(orderService.expireOrder(99L));
        assertFalse(orderService.expireOrder(99L));
        assertEquals(5, mockProduct.getStock());
        verify(voucherService, times(1)).releaseVoucher("SALE");
    }

    @Test
    void codShipsThenCompletesWithoutDoubleStockDeduction() {
        Order order = pendingOrder("COD");
        lockExisting(order);
        allowStockUpdate();
        allowOrderSave(false);
        orderService.updateOrderStatus(99L, OrderStatus.SHIPPING);
        orderService.updateOrderStatus(99L, OrderStatus.SHIPPING);
        orderService.updateOrderStatus(99L, OrderStatus.COMPLETED);
        assertEquals(3, mockProduct.getStock());
        assertEquals(0, mockProduct.getReservedStock());
        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        verify(productRepository, times(1)).save(mockProduct);
        verifyNoInteractions(voucherService);
    }

    @Test
    void adminCannotShipUnpaidPayosOrForcePayment() {
        Order order = pendingOrder("PAYOS_VIETQR");
        lockExisting(order);
        assertThrows(BadRequestException.class, () -> orderService.updateOrderStatus(99L, OrderStatus.SHIPPING));
        assertThrows(BadRequestException.class, () -> orderService.updateOrderStatus(99L, OrderStatus.PAID));
        assertThrows(BadRequestException.class, () -> orderService.updateOrderStatus(99L, OrderStatus.COMPLETED));
        verifyNoInteractions(productRepository, voucherService);
    }

    @Test
    void paidOrderCannotBeCancelledOrReopened() {
        Order order = pendingOrder("PAYOS_VIETQR");
        order.setStatus(OrderStatus.PAID);
        lockExisting(order);
        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(99L, 1L, false));
        assertThrows(BadRequestException.class, () -> orderService.updateOrderStatus(99L, OrderStatus.PENDING));
        verifyNoInteractions(productRepository, voucherService);
    }

    @Test
    void webhookRepeatIncludingAfterShippingDeductsReservationOnce() {
        Order order = pendingOrder("PAYOS_VIETQR");
        when(orderRepository.findByPayosOrderCodeForUpdate(1000000099L)).thenReturn(Optional.of(order));
        allowStockUpdate();
        allowOrderSave(false);
        orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount());
        orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount());
        order.setStatus(OrderStatus.SHIPPING);
        orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount());
        assertEquals(0, mockProduct.getReservedStock());
        assertEquals(3, mockProduct.getStock());
        verify(productRepository, times(1)).save(mockProduct);
    }

    @Test
    void wrongAmountAndCodWebhookAreRejected() {
        Order order = pendingOrder("PAYOS_VIETQR");
        when(orderRepository.findByPayosOrderCodeForUpdate(1000000099L)).thenReturn(Optional.of(order));
        assertThrows(BadRequestException.class,
                () -> orderService.handlePaymentSuccess(1000000099L, BigDecimal.ONE));
        order.setPaymentMethod("COD");
        assertThrows(BadRequestException.class,
                () -> orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount()));
        verifyNoInteractions(productRepository);
    }

    @Test
    void lateAndCancelledPaymentsRequireManualReconciliation() {
        Order order = pendingOrder("PAYOS_VIETQR");
        order.setExpiresAt(java.time.LocalDateTime.now().minusSeconds(1));
        when(orderRepository.findByPayosOrderCodeForUpdate(1000000099L)).thenReturn(Optional.of(order));
        assertThrows(BadRequestException.class,
                () -> orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount()));
        order.setStatus(OrderStatus.CANCELLED);
        assertThrows(BadRequestException.class,
                () -> orderService.handlePaymentSuccess(1000000099L, order.getTotalAmount()));
        verifyNoInteractions(productRepository);
    }

    @Test
    void insufficientReservedStockIsNotSilentlyClamped() {
        Order order = pendingOrder("COD");
        mockProduct.setReservedStock(0);
        lockExisting(order);
        allowStockUpdate();
        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(99L, 1L, false));
        assertEquals(OrderStatus.PENDING, order.getStatus());
        assertEquals(3, mockProduct.getStock());
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void schedulerContinuesWithOtherOrdersAfterFailure() {
        OrderService service = mock(OrderService.class);
        when(orderRepository.findExpiredPaymentOrderIds(any())).thenReturn(java.util.List.of(1L, 2L));
        when(service.expireOrder(1L)).thenThrow(new BadRequestException("Kho không khớp"));
        when(service.expireOrder(2L)).thenReturn(true);
        new StockSchedulerService(orderRepository, service).releaseExpiredStockReservations();
        verify(service).expireOrder(2L);
    }

    @Test
    void voucherReservationChecksLimitUnderLockAndCanBeReleased() {
        var repository = mock(com.sports.repository.VoucherRepository.class);
        var environment = mock(org.springframework.core.env.Environment.class);
        var service = new VoucherService(repository, environment);
        Voucher voucher = Voucher.builder().code("ONE").isActive(true).maxUses(1).usedCount(0)
                .discountType("FIXED").discountValue(new BigDecimal("10000")).build();
        when(repository.findByCodeForUpdate("ONE")).thenReturn(Optional.of(voucher));
        var request = new com.sports.dto.VoucherValidateRequest("ONE", new BigDecimal("500000"));
        service.reserveVoucher(request);
        assertEquals(1, voucher.getUsedCount());
        assertThrows(BadRequestException.class, () -> service.reserveVoucher(request));
        service.releaseVoucher("ONE");
        assertEquals(0, voucher.getUsedCount());
        assertTrue(service.reserveVoucher(request).isValid());
    }

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(1L)
                .username("testuser")
                .role(Role.ROLE_USER)
                .build();

        mockProduct = Product.builder()
                .id(10L)
                .name("Yonex Astrox 100ZZ")
                .price(new BigDecimal("4250000"))
                .stock(5)
                .reservedStock(0)
                .build();
    }

    private OrderCreateRequest prepareOrder(String price) {
        mockProduct.setPrice(new BigDecimal(price));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockUser));
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        OrderCreateRequest request = new OrderCreateRequest();
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 1)));
        request.setCustomerName("Khách kiểm thử");
        request.setShippingPhone("0900000000");
        request.setShippingAddress("Địa chỉ kiểm thử");
        return request;
    }

    private void allowOrderSave(boolean creating) {
        when(creating ? orderRepository.saveAndFlush(any(Order.class)) : orderRepository.save(any(Order.class)))
                .thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(99L);
            return order;
        });
    }

    @Test
    void ignoresValidClientShippingFee() {
        OrderCreateRequest request = prepareOrder("500000");
        request.setShippingFee(new BigDecimal("999999"));
        allowOrderSave(true);
        OrderResponse response = orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
        assertEquals(0, new BigDecimal("30000").compareTo(response.getShippingFee()));
        assertEquals(0, new BigDecimal("530000").compareTo(response.getTotalAmount()));
    }

    @Test
    void freeShippingAtThresholdIgnoresClientFee() {
        OrderCreateRequest request = prepareOrder("1000000");
        request.setShippingFee(new BigDecimal("999999"));
        allowOrderSave(true);
        OrderResponse response = orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getShippingFee()));
        assertEquals(0, new BigDecimal("1000000").compareTo(response.getTotalAmount()));
    }

    @Test
    void invalidVoucherPreventsOrderCreation() {
        OrderCreateRequest request = prepareOrder("500000");
        request.setVoucherCode("EXPIRED");
        when(voucherService.reserveVoucher(any())).thenThrow(new BadRequestException("Mã hết hạn"));
        assertThrows(BadRequestException.class, () -> orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        verify(orderRepository, never()).saveAndFlush(any());
        verify(voucherService, never()).incrementUsedCount(any());
    }

    @Test
    void preservesOptionsAndAppliesVoucherBeforeShipping() {
        OrderCreateRequest request = prepareOrder("1000000");
        request.setVoucherCode("SALE");
        request.getItems().get(0).setSelectedColor("Đỏ");
        request.getItems().get(0).setSelectedWeight("4U - G5");
        request.getItems().get(0).setStringingService("BG65Ti");
        request.getItems().get(0).setStringTension("10.5kg");
        when(voucherService.reserveVoucher(any())).thenReturn(
                com.sports.dto.VoucherValidateResponse.builder().valid(true).code("SALE")
                .discountAmount(new BigDecimal("100000")).finalTotal(new BigDecimal("900000")).build());
        allowOrderSave(true);
        OrderResponse response = orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
        assertEquals(0, new BigDecimal("900000").compareTo(response.getTotalAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getShippingFee()));
        assertEquals("Đỏ", response.getItems().get(0).getSelectedColor());
        assertEquals("4U - G5", response.getItems().get(0).getSelectedWeight());
        assertEquals("BG65Ti", response.getItems().get(0).getStringingService());
        assertEquals("10.5kg", response.getItems().get(0).getStringTension());
        verify(voucherService).reserveVoucher(any());
    }

    @Test
    @DisplayName("Đặt hàng thành công: Chuyển tồn kho từ stock sang reservedStock chuẩn Atomic")
    void testCreateOrder_SuccessfulReservation() {
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(0);
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(99L);
            return o;
        });

        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName("Nguyen Van A");
        request.setShippingPhone("0987654321");
        request.setShippingAddress("Ha Noi");
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 2)));

        OrderResponse response = orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();

        assertNotNull(response);
        assertEquals(99L, response.getId());
        assertEquals(3, mockProduct.getStock()); // 5 - 2 = 3
        assertEquals(2, mockProduct.getReservedStock()); // 0 + 2 = 2
        verify(productRepository).save(mockProduct);
    }

    @Test
    @DisplayName("Đặt hàng thất bại: Kho không đủ số lượng (InsufficientStockException)")
    void testCreateOrder_InsufficientStock() {
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(0);
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));

        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName("Nguyen Van A");
        request.setShippingPhone("0987654321");
        request.setShippingAddress("Ha Noi");
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 10))); // Muốn mua 10 trong khi kho chỉ có 5

        assertThrows(InsufficientStockException.class, () -> orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        assertEquals(5, mockProduct.getStock()); // Tồn kho không bị thay đổi
        assertEquals(0, mockProduct.getReservedStock());
    }

    @Test
    @DisplayName("Phòng chống Denial of Inventory: Chặn khi user có từ 3 đơn PENDING trở lên")
    void testCreateOrder_DenialOfInventoryBlocked() {
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(3);

        OrderCreateRequest request = new OrderCreateRequest();
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 1)));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> orderService.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        assertTrue(ex.getMessage().contains("chưa thanh toán"));
        verify(productRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Khách chủ động hủy đơn: Hoàn trả ngay reserved_stock về stock")
    void testCancelOrder_RestoresStock() {
        mockProduct.setStock(3);
        mockProduct.setReservedStock(2);

        OrderItem orderItem = OrderItem.builder()
                .product(mockProduct)
                .quantity(2)
                .price(mockProduct.getPrice())
                .build();

        Order order = Order.builder()
                .id(99L)
                .user(mockUser)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("8500000"))
                .items(Collections.singletonList(orderItem))
                .build();

        when(orderRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(order));
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.cancelOrder(99L, 1L, false);

        assertEquals("CANCELLED", response.getStatus());
        assertEquals(5, mockProduct.getStock()); // 3 + 2 = 5
        assertEquals(0, mockProduct.getReservedStock()); // 2 - 2 = 0
    }
}
