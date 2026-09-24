package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;
import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import com.sports.controller.PaymentController;
import com.sports.entity.Order;
import com.sports.entity.OrderItem;
import com.sports.entity.OrderStatus;
import com.sports.entity.Product;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import com.sports.service.OrderService;
import com.sports.service.PayOSService;
import com.sports.service.VoucherService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PayOSWebhookFuzzTest {
    private static final String TEST_KEY = "fuzz-only-key-not-a-payment-credential";

    @FuzzTest
    public void fuzzWebhookVerification(FuzzedDataProvider data) throws Exception {
        long orderCode = data.consumeLong();
        BigDecimal amount = BigDecimal.valueOf(data.consumeLong(1, Long.MAX_VALUE), data.consumeInt(0, 2));
        String description = data.consumeString(256);
        checkSignatures(orderCode, amount, description);
        checkPayment(orderCode, amount, description, data.consumeInt(0, 5));
    }

    @Test
    void paymentScenariosExerciseRealServices() throws Exception {
        for (int scenario = 0; scenario <= 5; scenario++) {
            checkPayment(99L, new BigDecimal("230000"), "Thanh toán & mô tả=thử", scenario);
        }
        checkSignatures(Long.MAX_VALUE, new BigDecimal("100.25"), "");
        PayOSService service = signatureService();
        assertFalse(service.verifyWebhookSignature(null));
        assertFalse(service.verifyWebhookSignature(new PayOSWebhookRequest()));
        PayOSWebhookRequest request = signedRequest(99L, BigDecimal.TEN, "00", "thử");
        request.setSignature(null);
        assertFalse(service.verifyWebhookSignature(request));
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

    private void checkPayment(long orderCode, BigDecimal amount, String description, int scenario)
            throws Exception {
        PaymentFixture fixture = new PaymentFixture(orderCode, amount);
        PayOSWebhookRequest request = signedRequest(orderCode, amount, "00", description);
        if (scenario == 1) request.setSignature("invalid");
        if (scenario == 2) request = signedRequest(orderCode, amount.add(BigDecimal.ONE), "00", description);
        if (scenario == 3) request = signedRequest(orderCode, amount, "01", description);
        if (scenario == 4) fixture.order.setStatus(OrderStatus.CANCELLED);
        if (scenario == 5) fixture.order.setExpiresAt(LocalDateTime.now().minusDays(1));
        OrderStatus initialStatus = fixture.order.getStatus();

        int status = fixture.controller.handlePayOSWebhook(request).getStatusCode().value();

        int expectedStatus = scenario == 1 ? 401 : scenario == 2 || scenario >= 4 ? 400 : 200;
        assertEquals(expectedStatus, status);
        if (scenario == 0) {
            fixture.assertPaidOnce(request);
        } else {
            fixture.assertUnchanged(initialStatus);
        }
    }

    private PayOSWebhookRequest signedRequest(long orderCode, BigDecimal amount, String code,
                                              String description) throws Exception {
        PayOSWebhookData payload = PayOSWebhookData.builder().orderCode(orderCode).amount(amount)
                .code(code).description(description).build();
        String canonical = "amount=" + amount + "&code=" + code
                + "&description=" + description + "&orderCode=" + orderCode;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)));
        return PayOSWebhookRequest.builder().code("00").data(payload).signature(signature).build();
    }

    private static PayOSService signatureService() {
        PayOSService service = new PayOSService();
        ReflectionTestUtils.setField(service, "checksumKey", TEST_KEY);
        return service;
    }

    private static class PaymentFixture {
        private final OrderRepository orders = mock(OrderRepository.class);
        private final ProductRepository products = mock(ProductRepository.class);
        private final Product product = Product.builder().id(10L).stock(8).reservedStock(2).build();
        private final Order order;
        private final PaymentController controller;

        private PaymentFixture(long orderCode, BigDecimal amount) {
            OrderItem item = OrderItem.builder().product(product).quantity(2).build();
            order = Order.builder().id(99L).payosOrderCode(orderCode).totalAmount(amount)
                    .paymentMethod("PAYOS_VIETQR").status(OrderStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusDays(1)).items(List.of(item)).build();
            when(orders.findByPayosOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(order));
            when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
            PayOSService signatures = signatureService();
            OrderService service = new OrderService(orders, products, mock(UserRepository.class),
                    signatures, mock(VoucherService.class), mock(EntityManager.class));
            controller = new PaymentController(signatures, service, new MockEnvironment());
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
            assertEquals(initialStatus, order.getStatus());
            assertEquals(8, product.getStock());
            assertEquals(2, product.getReservedStock());
            verify(products, never()).save(any());
            verify(orders, never()).save(any());
        }
    }
}
