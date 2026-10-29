package com.sports.service;

import com.sports.controller.OrderPaymentController;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.exception.*;
import com.sports.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

class PaymentLinkControllerTest {
    private final PaymentAttemptStore store = mock(PaymentAttemptStore.class);
    private final PayOSPaymentClient client = mock(PayOSPaymentClient.class);
    private final PaymentLinkService service = new PaymentLinkService(store, client);
    private final PaymentReconciliationService reconciliations = mock(PaymentReconciliationService.class);
    private final String key = UUID.randomUUID().toString();

    @Test
    void onlyDefiniteConnectionFailureGrantsRetryAndAmbiguousTimeoutDoesNot() {
        var creating = attempt(PaymentAttempt.Status.CREATING, null);
        when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, true));
        for (String code : new String[]{"PAYOS_CONNECTION_NOT_ESTABLISHED", "PAYOS_UNAVAILABLE", "PAYOS_INVALID_RESPONSE"}) {
            reset(client); clearInvocations(store);
            when(client.create(creating)).thenThrow(new PaymentLinkException(503, code, "Thử lỗi mạng"));
            org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> service.create(2L, 1L, key));
            verify(store, times(code.equals("PAYOS_CONNECTION_NOT_ESTABLISHED") ? 1 : 0)).markCreateNotSent(2L, 1L, 123L);
            verify(store, never()).saveResult(any(), any(), any(), anyBoolean());
        }
    }

    @Test
    void durableRetryClaimIsConsumedOnceAndPreservesAttemptIdentity() {
        var orders = mock(com.sports.repository.OrderRepository.class);
        var attempts = mock(com.sports.repository.PaymentAttemptRepository.class);
        var order = Order.builder().id(2L).user(User.builder().id(1L).build()).paymentMethod("PAYOS_VIETQR")
                .status(OrderStatus.PENDING).payosOrderCode(123L).totalAmount(BigDecimal.TEN).expiresAt(LocalDateTime.now().plusMinutes(15)).build();
        var attempt = new PaymentAttempt(); attempt.setId(7L); attempt.setOrder(order); attempt.setOrderCode(123L);
        attempt.setAmount(BigDecimal.TEN); attempt.setIdempotencyKey(key);
        when(orders.findByIdForUpdate(2L)).thenReturn(java.util.Optional.of(order));
        when(attempts.findByOrderCode(123L)).thenReturn(java.util.Optional.of(attempt));
        var actual = new PaymentAttemptStore(orders, attempts, mock(PaymentTransitionGuard.class));
        actual.markCreateNotSent(2L, 1L, 123L);
        var retry = actual.prepare(2L, 1L, key);
        org.junit.jupiter.api.Assertions.assertTrue(retry.created());
        org.junit.jupiter.api.Assertions.assertEquals(7L, retry.attempt().id());
        org.junit.jupiter.api.Assertions.assertEquals(123L, retry.attempt().orderCode());
        org.junit.jupiter.api.Assertions.assertNull(attempt.getReviewReason());
        org.junit.jupiter.api.Assertions.assertFalse(actual.prepare(2L, 1L, key).created());
        verify(orders, times(3)).findByIdForUpdate(2L);
        attempt.setStatus(PaymentAttempt.Status.PAID);
        actual.markCreateNotSent(2L, 1L, 123L);
        org.junit.jupiter.api.Assertions.assertNull(attempt.getReviewReason());
    }

    @Test
    void definiteFailureRetriesSameAttemptAndReturnsQrWithoutCreatingAnotherOrder() {
        var creating = attempt(PaymentAttempt.Status.CREATING, null);
        var pending = attempt(PaymentAttempt.Status.PENDING, "https://pay.payos.vn/web/test");
        var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "test", pending.checkoutUrl(), "NON_PAYABLE_TEST_QR");
        when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, true));
        when(client.create(creating)).thenThrow(new PaymentLinkException(503, "PAYOS_CONNECTION_NOT_ESTABLISHED", "Chưa gửi"))
                .thenReturn(result);
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> service.create(2L, 1L, key));
        when(store.saveResult(2L, 1L, result, true)).thenReturn(pending);
        var recovered = service.create(2L, 1L, key);
        org.junit.jupiter.api.Assertions.assertEquals(201, recovered.status());
        org.junit.jupiter.api.Assertions.assertEquals(creating.id(), recovered.attempt().id());
        org.junit.jupiter.api.Assertions.assertEquals(creating.orderId(), recovered.attempt().orderId());
        org.junit.jupiter.api.Assertions.assertEquals(creating.orderCode(), recovered.attempt().orderCode());
        verify(client, times(2)).create(creating);
        verify(store, times(1)).markCreateNotSent(2L, 1L, 123L);
        verify(client, never()).query(anyLong());
    }

    @Test
    void unresolvedProviderResultNeverGrantsPermissionToResendOrMarkPaid() {
        var creating = attempt(PaymentAttempt.Status.CREATING, null);
        when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, false));
        when(client.query(123L)).thenReturn(null);
        var outcome = service.create(2L, 1L, key);
        org.junit.jupiter.api.Assertions.assertEquals(202, outcome.status());
        org.junit.jupiter.api.Assertions.assertEquals(PaymentAttempt.Status.CREATING, outcome.attempt().status());
        verify(client, never()).create(any());
        verify(store, never()).markCreateNotSent(anyLong(), anyLong(), anyLong());
        verify(store, never()).saveResult(any(), any(), any(), anyBoolean());
    }

    @Test
    void ambiguousCreateThenVerifiedHostedRecoveryDoesNotResendOrCreateNewOrder() {
        var creating = attempt(PaymentAttempt.Status.CREATING, null);
        var pending = attempt(PaymentAttempt.Status.PENDING, "https://pay.payos.vn/web/124c33293c934a85be5b7f8761a27a07");
        var recovered = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "124c33293c934a85be5b7f8761a27a07", pending.checkoutUrl(), null, true);
        when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, true),
                new PaymentAttemptStore.Prepared(creating, false));
        when(client.create(creating)).thenThrow(new PaymentLinkException(504, "PAYOS_UNAVAILABLE", "Timeout"));
        when(client.query(123L)).thenReturn(recovered);
        when(store.saveResult(2L, 1L, recovered, false)).thenReturn(pending);
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> service.create(2L, 1L, key));
        var outcome = service.create(2L, 1L, key);
        org.junit.jupiter.api.Assertions.assertEquals(200, outcome.status());
        org.junit.jupiter.api.Assertions.assertEquals(creating.orderId(), outcome.attempt().orderId());
        org.junit.jupiter.api.Assertions.assertEquals(creating.id(), outcome.attempt().id());
        verify(client, times(1)).create(creating);
        verify(client, times(1)).query(123L);
        verify(store, never()).markCreateNotSent(anyLong(), anyLong(), anyLong());
    }

    @Test
    void verifiedRecoveryBecomesPendingAndReplayPreservesOriginalResult() {
        var attempt = storedCreating();
        var actual = actualStore(attempt);
        var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "verified-id", "https://pay.payos.vn/web/verified-id", null, true);
        var recovered = actual.saveResult(2L, 1L, result, false);
        org.junit.jupiter.api.Assertions.assertEquals(PaymentAttempt.Status.PENDING, recovered.status());
        org.junit.jupiter.api.Assertions.assertEquals(result.checkoutUrl(), recovered.checkoutUrl());
        org.junit.jupiter.api.Assertions.assertNull(recovered.qrPayload());
        org.junit.jupiter.api.Assertions.assertEquals(7L, recovered.id());
        org.junit.jupiter.api.Assertions.assertEquals(key, attempt.getIdempotencyKey());
        org.junit.jupiter.api.Assertions.assertEquals(recovered, actual.saveResult(2L, 1L, result, false));
        org.junit.jupiter.api.Assertions.assertEquals(OrderStatus.PENDING, attempt.getOrder().getStatus());
    }

    @Test
    void recoveryRejectsMismatchWrongOwnerAndExpiredOrChangedOrder() {
        var attempt = storedCreating();
        var actual = actualStore(attempt);
        var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "verified-id", "https://pay.payos.vn/web/verified-id", null, true);
        var mismatch = new PayOSPaymentClient.Result(123L, BigDecimal.ONE, "verified-id", result.checkoutUrl(), null);
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> actual.saveResult(2L, 1L, mismatch, false));
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> actual.saveResult(2L, 9L, result, false));
        attempt.getOrder().setExpiresAt(LocalDateTime.now().minusSeconds(1));
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> actual.saveResult(2L, 1L, result, false));
        attempt.getOrder().setExpiresAt(LocalDateTime.now().plusMinutes(15));
        attempt.getOrder().setPaymentMethod("COD");
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> actual.saveResult(2L, 1L, result, false));
        org.junit.jupiter.api.Assertions.assertEquals(PaymentAttempt.Status.CREATING, attempt.getStatus());
        org.junit.jupiter.api.Assertions.assertNull(attempt.getCheckoutUrl());
    }

    @Test
    void recoveryNeverResetsTerminalAttemptAfterConcurrentSettlement() {
        var attempt = storedCreating();
        var actual = actualStore(attempt);
        var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "verified-id", "https://pay.payos.vn/web/verified-id", null, true);
        for (var status : new PaymentAttempt.Status[]{PaymentAttempt.Status.PAID, PaymentAttempt.Status.NEEDS_REVIEW,
                PaymentAttempt.Status.CANCELLED, PaymentAttempt.Status.EXPIRED, PaymentAttempt.Status.FAILED}) {
            attempt.setStatus(status);
            org.junit.jupiter.api.Assertions.assertEquals(status, actual.saveResult(2L, 1L, result, false).status());
            org.junit.jupiter.api.Assertions.assertNull(attempt.getCheckoutUrl());
        }
    }

    @Test
    void originalQueryResultWithoutFreshPendingProofDoesNotBecomePayable() {
        var attempt = storedCreating();
        var actual = actualStore(attempt);
        var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "original-id", "http://localhost:5173/payment/qr/2", null);
        var response = actual.saveResult(2L, 1L, result, false);
        org.junit.jupiter.api.Assertions.assertEquals(PaymentAttempt.Status.CREATING, response.status());
        org.junit.jupiter.api.Assertions.assertNull(response.checkoutUrl());
        org.junit.jupiter.api.Assertions.assertEquals("original-id", response.paymentLinkId());
    }

    private PaymentAttempt storedCreating() {
        var order = Order.builder().id(2L).user(User.builder().id(1L).build()).paymentMethod("PAYOS_VIETQR")
                .status(OrderStatus.PENDING).payosOrderCode(123L).totalAmount(BigDecimal.TEN)
                .expiresAt(LocalDateTime.now().plusMinutes(15)).build();
        var attempt = new PaymentAttempt();
        attempt.setId(7L); attempt.setOrder(order); attempt.setOrderCode(123L);
        attempt.setAmount(BigDecimal.TEN); attempt.setIdempotencyKey(key);
        attempt.setExpiresAt(order.getExpiresAt());
        return attempt;
    }

    @Test
    void actualGatewayAndStoreRecoverAfterLostCreateResponseUsingOnlyOneProviderPost() {
        var attempt = storedCreating();
        var gateway = realTestGateway();
        var http = (org.springframework.web.client.RestTemplate) org.springframework.test.util.ReflectionTestUtils.getField(gateway, "http");
        var server = org.springframework.test.web.client.MockRestServiceServer.bindTo(http).build();
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.method(org.springframework.http.HttpMethod.POST))
                .andRespond(request -> { throw new java.net.SocketTimeoutException("lost response"); });
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://provider.test/v2/payment-requests/123"))
                .andExpect(org.springframework.test.web.client.match.MockRestRequestMatchers.method(org.springframework.http.HttpMethod.GET))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(
                        signedPendingRecovery(), org.springframework.http.MediaType.APPLICATION_JSON));
        org.junit.jupiter.api.Assertions.assertThrows(PaymentLinkException.class, () -> gateway.create(PaymentAttemptResponse.from(attempt)));
        var actual = new PaymentLinkService(actualStore(attempt), gateway);
        var recovered = actual.create(2L, 1L, key);
        org.junit.jupiter.api.Assertions.assertEquals(200, recovered.status());
        org.junit.jupiter.api.Assertions.assertEquals(PaymentAttempt.Status.PENDING, recovered.attempt().status());
        org.junit.jupiter.api.Assertions.assertEquals(7L, recovered.attempt().id());
        org.junit.jupiter.api.Assertions.assertEquals("https://pay.payos.vn/web/124c33293c934a85be5b7f8761a27a07", recovered.attempt().checkoutUrl());
        org.junit.jupiter.api.Assertions.assertNull(recovered.attempt().qrPayload());
        org.junit.jupiter.api.Assertions.assertEquals(recovered.attempt(), actual.create(2L, 1L, key).attempt());
        server.verify();
    }

    private PayOSPaymentClient realTestGateway() {
        var gateway = new PayOSPaymentClient(new PayOSService(), 1000, 1000);
        java.util.Map.of("clientId", "fake-client", "apiKey", "fake-api", "checksumKey", "fake-checksum",
                "baseUrl", "https://provider.test", "returnUrl", "https://shop.test/order-success/{orderId}",
                "cancelUrl", "https://shop.test/payment/qr/{orderId}?cancelled=1")
                .forEach((field, value) -> org.springframework.test.util.ReflectionTestUtils.setField(gateway, field, value));
        return gateway;
    }

    private String signedPendingRecovery() {
        String data = "{\"id\":\"124c33293c934a85be5b7f8761a27a07\",\"orderCode\":123,\"amount\":10,"
                + "\"amountPaid\":0,\"amountRemaining\":10,\"status\":\"PENDING\",\"transactions\":[]}";
        String canonical = "amount=10&amountPaid=0&amountRemaining=10&id=124c33293c934a85be5b7f8761a27a07&orderCode=123&status=PENDING&transactions=[]";
        return "{\"code\":\"00\",\"data\":" + data + ",\"signature\":\""
                + new PayOSService().hmacSha256(canonical, "fake-checksum") + "\"}";
    }

    private PaymentAttemptStore actualStore(PaymentAttempt attempt) {
        var orders = mock(com.sports.repository.OrderRepository.class);
        var attempts = mock(com.sports.repository.PaymentAttemptRepository.class);
        when(orders.findByIdForUpdate(2L)).thenReturn(java.util.Optional.of(attempt.getOrder()));
        when(attempts.findByOrderCode(123L)).thenReturn(java.util.Optional.of(attempt));
        when(attempts.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        return new PaymentAttemptStore(orders, attempts, mock(PaymentTransitionGuard.class));
    }

    @Test
    void securityRequiresLoginAndInvalidUuidDoesNotTouchStore() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mvc.perform(post("/api/orders/2/payment-link").header("Idempotency-Key", key))
                    .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IDEMPOTENCY_KEY"));
            verifyNoInteractions(store, client);
        }
    }

    @Test
    void newExistingAndUnresolvedHaveCorrectHttpStatuses() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            var creating = attempt(PaymentAttempt.Status.CREATING, null);
            var pending = attempt(PaymentAttempt.Status.PENDING, "https://pay.payos.vn/web/test");
            when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, true),
                    new PaymentAttemptStore.Prepared(pending, false), new PaymentAttemptStore.Prepared(creating, false));
            var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "test", pending.checkoutUrl(), null);
            when(client.create(creating)).thenReturn(result);
            when(store.saveResult(2L, 1L, result, true)).thenReturn(pending);
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.checkoutUrl").value(pending.checkoutUrl()));
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("CREATING"));
            verify(client, times(1)).create(any());
            verify(client).query(123L);
        }
    }

    @Test
    void forbiddenAndGatewayErrorsHaveSanitizedContract() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            for (int code : new int[] {403, 404, 409, 502, 503, 504}) {
                doThrow(new PaymentLinkException(code, "PAYMENT_ERROR", "Lỗi kiểm thử"))
                        .when(store).prepare(2L, 1L, key);
                mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                        .andExpect(status().is(code)).andExpect(jsonPath("$.code").value("PAYMENT_ERROR"))
                        .andExpect(jsonPath("$.path").value("/api/orders/2/payment-link"));
            }
        }
    }

    @Test
    void refreshRequiresLoginAndReturnsVerifiedResult() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mvc.perform(post("/api/orders/2/payment/refresh")).andExpect(status().isUnauthorized());
            verifyNoInteractions(reconciliations);
            var paid = attempt(PaymentAttempt.Status.PAID, null);
            when(reconciliations.refresh(2L, 1L, false))
                    .thenReturn(new PaymentSettlementService.Outcome(200, paid));
            mvc.perform(post("/api/orders/2/payment/refresh").with(user(principal())))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"));
        }
    }

    @Test
    void refreshPropagatesAuthorizationAndProviderErrorsWithoutSuccess() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            for (int code : new int[] {403, 404, 409, 502, 503, 504}) {
                doThrow(new PaymentLinkException(code, "PAYMENT_ERROR", "Không thể xác minh"))
                        .when(reconciliations).refresh(2L, 1L, false);
                mvc.perform(post("/api/orders/2/payment/refresh").with(user(principal())))
                        .andExpect(status().is(code)).andExpect(jsonPath("$.code").value("PAYMENT_ERROR"));
            }
        }
    }

    private CustomUserDetails principal() {
        return new CustomUserDetails(User.builder().id(1L).username("test").role(Role.ROLE_USER).build());
    }

    private PaymentAttemptResponse attempt(PaymentAttempt.Status status, String url) {
        return new PaymentAttemptResponse(1L, 2L, "PAYOS", 123L, null, BigDecimal.TEN, "VND",
                status, url, null, LocalDateTime.now().plusMinutes(15), null, null, null);
    }

    private AnnotationConfigWebApplicationContext context() {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(SecurityConfig.class, OrderPaymentController.class, GlobalExceptionHandler.class, WebConfig.class);
        context.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("paymentLinkService", service);
            factory.registerSingleton("paymentReconciliationService", reconciliations);
            factory.registerSingleton("jwtAuthenticationFilter", new JwtAuthenticationFilter(
                    mock(JwtTokenProvider.class), mock(UserDetailsServiceImpl.class)));
        });
        context.refresh();
        return context;
    }

    @Configuration @EnableWebMvc
    static class WebConfig {}
}
