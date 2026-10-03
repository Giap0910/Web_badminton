package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;
import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.controller.PaymentController;
import com.sports.entity.Order;
import com.sports.entity.OrderItem;
import com.sports.entity.OrderStatus;
import com.sports.entity.Product;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.UnauthorizedException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import com.sports.service.OrderService;
import com.sports.service.PayOSService;
import com.sports.service.VoucherService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.StringJoiner;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PayOSWebhookFuzzTest {
    private static final String TEST_KEY = "fuzz-only-key-not-a-payment-credential";

    @FuzzTest
    public void fuzzWebhookVerification(FuzzedDataProvider data) throws Exception {
        PaymentCase scenario = data.pickValue(PaymentCase.values());
        long orderCode = data.consumeLong();
        BigDecimal amount = BigDecimal.valueOf(data.consumeLong(1, Long.MAX_VALUE), data.consumeInt(0, 2));
        String description = data.consumeString(4096);
        checkSignatures(orderCode, amount, description);
        checkPayment(orderCode, amount, description, scenario);
        if (Boolean.getBoolean("fuzz.trace.scenarios")) {
            System.out.println("FUZZ_PAYMENT_CASE=" + scenario.name());
        }
    }

    @ParameterizedTest(name = "Chọn tình huống trước chuỗi: {0}")
    @EnumSource(PaymentCase.class)
    void webhookScenarioIsSelectedBeforeVariableLengthData(PaymentCase scenario) throws Exception {
        FuzzedDataProvider data = mock(FuzzedDataProvider.class);
        when(data.pickValue(PaymentCase.values())).thenReturn(scenario);
        when(data.consumeLong()).thenReturn(99L);
        when(data.consumeLong(1, Long.MAX_VALUE)).thenReturn(230000L);
        when(data.consumeString(4096)).thenReturn("Chuỗi dài & trường=thử".repeat(100));

        fuzzWebhookVerification(data);

        var consumption = inOrder(data);
        consumption.verify(data).pickValue(PaymentCase.values());
        consumption.verify(data).consumeLong();
        consumption.verify(data).consumeLong(1, Long.MAX_VALUE);
        consumption.verify(data).consumeInt(0, 2);
        consumption.verify(data).consumeString(4096);
        consumption.verifyNoMoreInteractions();
    }

    @FuzzTest
    public void fuzzMalformedWebhook(FuzzedDataProvider data) throws Exception {
        checkMalformed(data.consumeInt(0, 4), data.consumeString(4096));
    }

    @FuzzTest
    public void fuzzOrderLifecycle(FuzzedDataProvider data) throws Exception {
        checkLifecycle(data.consumeInt(1, 100), data.consumeInt(0, 4));
    }

    @ParameterizedTest(name = "Webhook: {0}")
    @EnumSource(PaymentCase.class)
    void paymentScenariosExerciseRealServices(PaymentCase scenario) throws Exception {
        checkPayment(99L, new BigDecimal("230000"), "Thanh toán & mô tả=thử", scenario);
    }

    @ParameterizedTest(name = "WH-04: dữ liệu thiếu/sai {0}")
    @ValueSource(ints = {0, 1, 2, 3, 4})
    void malformedWebhookBoundaries(int scenario) throws Exception {
        checkMalformed(scenario, "x".repeat(4096));
    }

    @ParameterizedTest(name = "Chuỗi trạng thái {0}")
    @ValueSource(ints = {0, 1, 2, 3, 4})
    void orderLifecycleBoundaries(int scenario) throws Exception {
        checkLifecycle(1, scenario);
        checkLifecycle(100, scenario);
    }

    @ParameterizedTest(name = "Chữ ký và số tiền {0}")
    @ValueSource(strings = {"0", "-1", "100.25", "230000.00", "9223372036854775807", "92233720368547758.07"})
    void signatureAmountBoundaries(String value) throws Exception {
        checkSignatures(Long.MAX_VALUE, new BigDecimal(value), "");
    }

    @Test
    void signatureProtectsOrderCodeAndDescription() throws Exception {
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "Đơn thử");
        request.getData().setOrderCode(100L);
        assertFalse(signatureService().verifyWebhookSignature(request));
        request.getData().setOrderCode(99L);
        request.getData().setDescription("Đơn đã sửa");
        assertFalse(signatureService().verifyWebhookSignature(request));
    }

    @Test
    void paidOrderDoesNotLeakIntoNextIteration() throws Exception {
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "thử độc lập");
        PaymentFixture first = new PaymentFixture(99L, BigDecimal.TEN);
        assertEquals(200, first.controller.handlePayOSWebhook(request).getStatusCode().value());
        first.assertPaidOnce(request);

        PaymentFixture next = new PaymentFixture(99L, BigDecimal.TEN);
        next.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(next.orders, next.products, next.users, next.vouchers);
        assertEquals(200, next.controller.handlePayOSWebhook(request).getStatusCode().value());

        next.assertPaidOnce(request);
        assertEquals(OrderStatus.PAID, first.order.getStatus());
        verify(first.orders, times(1)).save(first.order);
        verify(first.products, times(1)).save(first.product);
    }

    @Test
    void checksumConfigurationDoesNotLeakIntoNextIteration() throws Exception {
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "khóa test riêng");
        PayOSService changed = signatureService();
        ReflectionTestUtils.setField(changed, "checksumKey", "different-test-key");

        assertFalse(changed.verifyWebhookSignature(request));
        assertTrue(signatureService().verifyWebhookSignature(request));
        assertFalse(changed.verifyWebhookSignature(request));
    }

    @Test
    void signedUnderpaymentIsRejectedWithoutChangingStock() throws Exception {
        PaymentFixture fixture = new PaymentFixture(99L, new BigDecimal("230000"));
        PayOSWebhookRequest request = signedRequest(99L, new BigDecimal("229999"), "00", "Thiếu 1");

        assertTrue(signatureService().verifyWebhookSignature(request));
        assertEquals(400, fixture.controller.handlePayOSWebhook(request).getStatusCode().value());

        fixture.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(fixture.products, fixture.vouchers);
    }

    @Test
    void anotherCustomerCannotCancelOrder() {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);

        assertThrows(UnauthorizedException.class, () -> fixture.service.cancelOrder(99L, 2L, false));

        fixture.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(fixture.products, fixture.vouchers);
    }

    @Test
    void adminCanCancelAnotherCustomersPendingOrder() {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);
        when(fixture.orders.save(fixture.order)).thenReturn(fixture.order);

        fixture.service.cancelOrder(99L, 2L, true);

        assertEquals(OrderStatus.CANCELLED, fixture.order.getStatus());
        assertEquals(10, fixture.product.getStock());
        assertEquals(0, fixture.product.getReservedStock());
        verify(fixture.orders).save(fixture.order);
        verify(fixture.products).save(fixture.product);
        verify(fixture.vouchers).releaseVoucher(null);
    }

    @ParameterizedTest(name = "Không hủy đơn ở trạng thái {0}")
    @EnumSource(value = OrderStatus.class, names = {"PAID", "SHIPPING", "COMPLETED"})
    void nonPendingOrdersCannotBeCancelled(OrderStatus status) {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);
        fixture.order.setStatus(status);

        assertThrows(BadRequestException.class, () -> fixture.service.cancelOrder(99L, 1L, false));

        fixture.assertUnchanged(status);
        verifyNoInteractions(fixture.products, fixture.vouchers);
    }

    @Test
    void missingExpiryDoesNotAutomaticallyCancelOrder() {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);
        fixture.order.setExpiresAt(null);

        assertFalse(fixture.service.expireOrder(99L));

        fixture.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(fixture.products, fixture.vouchers);
    }

    @ParameterizedTest(name = "Khóa checksum không dùng được: {0}")
    @ValueSource(booleans = {false, true})
    void unusableChecksumKeyFailsClosed(boolean missingKey) throws Exception {
        PayOSService service = signatureService();
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "Khóa test");
        ReflectionTestUtils.setField(service, "checksumKey", missingKey ? null : "");

        assertFalse(service.verifyWebhookSignature(request));

        assertTrue(signatureService().verifyWebhookSignature(request));
    }

    @ParameterizedTest(name = "Chặn chuyển đơn PayOS chưa trả tiền sang {0}")
    @EnumSource(value = OrderStatus.class, names = {"PAID", "SHIPPING", "COMPLETED"})
    void pendingPayosOrderCannotSkipPayment(OrderStatus nextStatus) {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);

        assertThrows(BadRequestException.class,
                () -> fixture.service.updateOrderStatus(99L, nextStatus));

        fixture.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(fixture.products, fixture.vouchers);
    }

    @Test
    void codShippingSettlesReservationOnlyOnce() {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);
        fixture.order.setPaymentMethod("COD");
        when(fixture.orders.save(fixture.order)).thenReturn(fixture.order);

        fixture.service.updateOrderStatus(99L, OrderStatus.SHIPPING);
        fixture.service.updateOrderStatus(99L, OrderStatus.SHIPPING);
        fixture.service.updateOrderStatus(99L, OrderStatus.COMPLETED);

        assertEquals(OrderStatus.COMPLETED, fixture.order.getStatus());
        assertEquals(8, fixture.product.getStock());
        assertEquals(0, fixture.product.getReservedStock());
        verify(fixture.products).save(fixture.product);
        verify(fixture.orders, times(2)).save(fixture.order);
        verifyNoInteractions(fixture.vouchers);
    }

    private void checkMalformed(int scenario, String garbage) throws Exception {
        PaymentFixture fixture = new PaymentFixture(99L, BigDecimal.TEN);
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "thử");
        if (scenario == 0) {
            assertFalse(signatureService().verifyWebhookSignature(null));
            fixture.assertUnchanged(OrderStatus.PENDING);
            return;
        }
        if (scenario == 1) request.setData(null);
        if (scenario == 2) request.setSignature(null);
        if (scenario == 3) request.setSignature("");
        if (scenario == 4) request.setSignature("!" + garbage);
        assertFalse(signatureService().verifyWebhookSignature(request));
        assertEquals(401, fixture.controller.handlePayOSWebhook(request).getStatusCode().value());
        fixture.assertUnchanged(OrderStatus.PENDING);
        verifyNoInteractions(fixture.orders);
    }

    private void checkSignatures(long orderCode, BigDecimal amount, String description) throws Exception {
        PayOSService service = signatureService();
        PayOSWebhookRequest request = signedRequest(orderCode, amount, "00", description);
        assertTrue(service.verifyWebhookSignature(request), "Chữ ký hợp lệ phải được chấp nhận");
        String validSignature = request.getSignature();
        request.setSignature("x" + validSignature.substring(1));
        assertFalse(service.verifyWebhookSignature(request), "Chữ ký bị sửa phải bị từ chối");
        request.setSignature(validSignature);
        request.getData().setAmount(amount.add(BigDecimal.ONE));
        assertFalse(service.verifyWebhookSignature(request), "Số tiền bị sửa phải làm chữ ký mất hiệu lực");
    }

    private void checkPayment(long orderCode, BigDecimal amount, String description, PaymentCase scenario)
            throws Exception {
        PaymentFixture fixture = new PaymentFixture(orderCode, amount);
        PayOSWebhookRequest request = signedRequest(orderCode, amount, "00", description);
        configurePayment(fixture, request, scenario);
        OrderStatus initialStatus = fixture.order.getStatus();
        int initialReserved = fixture.product.getReservedStock();

        int status = fixture.controller.handlePayOSWebhook(request).getStatusCode().value();

        assertEquals(scenario.status, status);
        if (scenario == PaymentCase.VALID || scenario == PaymentCase.EQUAL_AMOUNT_SCALE) {
            fixture.assertPaidOnce(request);
        } else {
            fixture.assertUnchanged(initialStatus, initialReserved);
        }
    }

    private void configurePayment(PaymentFixture fixture, PayOSWebhookRequest request, PaymentCase scenario)
            throws Exception {
        PayOSWebhookData payload = request.getData();
        switch (scenario) {
            case AMOUNT_MISMATCH -> payload.setAmount(payload.getAmount().add(BigDecimal.ONE));
            case NULL_AMOUNT -> payload.setAmount(null);
            case NEGATIVE_AMOUNT -> payload.setAmount(BigDecimal.ONE.negate());
            case EQUAL_AMOUNT_SCALE -> fixture.order.setTotalAmount(payload.getAmount().setScale(3));
            case FAILED_STATUS -> payload.setCode("01");
            case NULL_STATUS -> payload.setCode(null);
            case CANCELLED -> fixture.order.setStatus(OrderStatus.CANCELLED);
            case EXPIRED -> fixture.order.setExpiresAt(LocalDateTime.now().minusDays(1));
            case NULL_EXPIRY -> fixture.order.setExpiresAt(null);
            case COD -> fixture.order.setPaymentMethod("COD");
            case MISSING_ORDER -> when(fixture.orders.findByPayosOrderCodeForUpdate(payload.getOrderCode()))
                    .thenReturn(Optional.empty());
            case NULL_ORDER_CODE -> payload.setOrderCode(null);
            case INSUFFICIENT_RESERVATION -> fixture.product.setReservedStock(1);
            default -> { }
        }
        request.setSignature(scenario == PaymentCase.INVALID_SIGNATURE ? "invalid" : sign(payload));
    }

    private PayOSWebhookRequest signedRequest(Long orderCode, BigDecimal amount, String code,
                                              String description) throws Exception {
        PayOSWebhookData payload = PayOSWebhookData.builder().orderCode(orderCode).amount(amount)
                .code(code).description(description).build();
        return PayOSWebhookRequest.builder().code("00").data(payload).signature(sign(payload)).build();
    }

    private String sign(PayOSWebhookData payload) throws Exception {
        StringJoiner canonical = new StringJoiner("&");
        addField(canonical, "amount", payload.getAmount());
        addField(canonical, "code", payload.getCode());
        addField(canonical, "description", payload.getDescription());
        addField(canonical, "orderCode", payload.getOrderCode());
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(canonical.toString().getBytes(StandardCharsets.UTF_8)));
    }

    private void addField(StringJoiner canonical, String name, Object value) {
        if (value != null) canonical.add(name + "=" + value);
    }

    private void checkLifecycle(int quantity, int scenario) throws Exception {
        PaymentFixture fixture = new PaymentFixture(1_000_000_099L, BigDecimal.TEN);
        fixture.createOrder(quantity, scenario >= 3 ? "COD" : "PAYOS_VIETQR");
        PayOSWebhookRequest request = signedRequest(1_000_000_099L, fixture.order.getTotalAmount(), "00", "thử");
        if (scenario == 0) {
            checkPaidLifecycle(fixture, request);
        } else if (scenario == 4) {
            fixture.order.setExpiresAt(LocalDateTime.now().minusDays(1));
            assertFalse(fixture.service.expireOrder(99L));
            assertEquals(OrderStatus.PENDING, fixture.order.getStatus());
            assertEquals(quantity, fixture.product.getReservedStock());
            assertEquals(8, fixture.product.getStock());
            verify(fixture.products, times(1)).save(fixture.product);
        } else {
            checkCancelledLifecycle(fixture, request, quantity, scenario == 2);
        }
    }

    private void checkPaidLifecycle(PaymentFixture fixture, PayOSWebhookRequest request) {
        assertEquals(200, fixture.controller.handlePayOSWebhook(request).getStatusCode().value());
        for (OrderStatus state : List.of(OrderStatus.PAID, OrderStatus.SHIPPING, OrderStatus.COMPLETED)) {
            fixture.service.updateOrderStatus(99L, state);
            assertEquals(200, fixture.controller.handlePayOSWebhook(request).getStatusCode().value());
            assertEquals(state, fixture.order.getStatus());
            assertEquals(8, fixture.product.getStock());
            assertEquals(0, fixture.product.getReservedStock());
        }
        verify(fixture.products, times(2)).save(fixture.product);
    }

    private void checkCancelledLifecycle(PaymentFixture fixture, PayOSWebhookRequest request,
                                         int quantity, boolean expired) {
        if (expired) {
            assertFalse(fixture.service.expireOrder(99L));
            fixture.order.setExpiresAt(LocalDateTime.now().minusDays(1));
            assertTrue(fixture.service.expireOrder(99L));
            assertFalse(fixture.service.expireOrder(99L));
        } else {
            fixture.service.cancelOrder(99L, 1L, false);
            fixture.service.cancelOrder(99L, 1L, false);
        }
        assertEquals(400, fixture.controller.handlePayOSWebhook(request).getStatusCode().value());
        assertEquals(OrderStatus.CANCELLED, fixture.order.getStatus());
        assertEquals(8 + quantity, fixture.product.getStock());
        assertEquals(0, fixture.product.getReservedStock());
        verify(fixture.products, times(2)).save(fixture.product);
        verify(fixture.vouchers, times(1)).releaseVoucher(null);
    }

    private enum PaymentCase {
        VALID(200), INVALID_SIGNATURE(401), AMOUNT_MISMATCH(400), FAILED_STATUS(200),
        CANCELLED(400), EXPIRED(400), NULL_AMOUNT(400), NEGATIVE_AMOUNT(400), NULL_STATUS(200),
        COD(400), MISSING_ORDER(500), NULL_ORDER_CODE(500), NULL_EXPIRY(400),
        INSUFFICIENT_RESERVATION(400), EQUAL_AMOUNT_SCALE(200);

        private final int status;

        PaymentCase(int status) {
            this.status = status;
        }
    }

    private static PayOSService signatureService() {
        PayOSService service = new PayOSService();
        ReflectionTestUtils.setField(service, "checksumKey", TEST_KEY);
        return service;
    }

    private static class PaymentFixture {
        private final OrderRepository orders = mock(OrderRepository.class);
        private final ProductRepository products = mock(ProductRepository.class);
        private final UserRepository users = mock(UserRepository.class);
        private final VoucherService vouchers = mock(VoucherService.class);
        private final Product product = Product.builder().id(10L).stock(8).reservedStock(2).build();
        private Order order;
        private final OrderService service;
        private final PaymentController controller;

        private PaymentFixture(long orderCode, BigDecimal amount) {
            OrderItem item = OrderItem.builder().product(product).quantity(2).build();
            order = Order.builder().id(99L).payosOrderCode(orderCode).totalAmount(amount)
                    .user(User.builder().id(1L).build())
                    .paymentMethod("PAYOS_VIETQR").status(OrderStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusDays(1)).items(List.of(item)).build();
            when(orders.findByPayosOrderCodeForUpdate(orderCode)).thenAnswer(invocation -> Optional.of(order));
            when(orders.findByIdForUpdate(99L)).thenAnswer(invocation -> Optional.of(order));
            when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
            PayOSService signatures = signatureService();
            service = new OrderService(orders, products, users,
                    signatures, vouchers, mock(EntityManager.class));
            controller = new PaymentController(signatures, service, new MockEnvironment());
        }

        private void createOrder(int quantity, String method) {
            product.setPrice(new BigDecimal("100000"));
            product.setStock(quantity + 8);
            product.setReservedStock(0);
            when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(order.getUser()));
            when(orders.saveAndFlush(any(Order.class))).thenAnswer(invocation -> {
                order = invocation.getArgument(0);
                order.setId(99L);
                return order;
            });
            OrderCreateRequest request = new OrderCreateRequest();
            request.setItems(List.of(new OrderItemRequest(10L, quantity)));
            request.setPaymentMethod(method);
            request.setCustomerName("Khách kiểm thử");
            request.setShippingPhone("0900000000");
            request.setShippingAddress("Địa chỉ kiểm thử");
            service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
            when(orders.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
            assertEquals(OrderStatus.PENDING, order.getStatus());
            assertEquals(8, product.getStock());
            assertEquals(quantity, product.getReservedStock());
        }

        private void assertPaidOnce(PayOSWebhookRequest request) {
            assertEquals(OrderStatus.PAID, order.getStatus());
            assertEquals(0, product.getReservedStock());
            assertEquals(200, controller.handlePayOSWebhook(request).getStatusCode().value());
            assertEquals(OrderStatus.PAID, order.getStatus());
            assertEquals(8, product.getStock());
            assertEquals(0, product.getReservedStock());
            verify(products, times(1)).save(product);
            verify(orders, times(1)).save(order);
        }

        private void assertUnchanged(OrderStatus initialStatus) {
            assertUnchanged(initialStatus, 2);
        }

        private void assertUnchanged(OrderStatus initialStatus, int reserved) {
            assertEquals(initialStatus, order.getStatus());
            assertEquals(8, product.getStock());
            assertEquals(reserved, product.getReservedStock());
            verify(products, never()).save(any());
            verify(orders, never()).save(any());
        }
    }
}
