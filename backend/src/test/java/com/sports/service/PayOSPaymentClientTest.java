package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.PaymentAttempt;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.*;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.env.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class PayOSPaymentClientTest {
    private PayOSPaymentClient client;
    private MockRestServiceServer server;
    private final PayOSService signatures = new PayOSService();

    @BeforeEach
    void fixture() {
        client = new PayOSPaymentClient(signatures, 1000, 1000);
        ReflectionTestUtils.setField(client, "clientId", "fake-client");
        ReflectionTestUtils.setField(client, "apiKey", "fake-api");
        ReflectionTestUtils.setField(client, "checksumKey", "fake-checksum");
        ReflectionTestUtils.setField(client, "baseUrl", "https://provider.test");
        ReflectionTestUtils.setField(client, "returnUrl", "https://shop.test/order-success/{orderId}");
        ReflectionTestUtils.setField(client, "cancelUrl", "https://shop.test/payment/qr/{orderId}?cancelled=1");
        server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(client, "http")).build();
    }

    @Test
    void exactCreateRequestAndSignedResponse() {
        String canonical = "amount=100000&cancelUrl=https://shop.test/payment/qr/501?cancelled=1&description=BADMINTON"
                + "&orderCode=123&returnUrl=https://shop.test/order-success/501";
        server.expect(requestTo("https://provider.test/v2/payment-requests"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("x-api-key", "fake-api"))
                .andExpect(jsonPath("$.amount").value(100000)).andExpect(jsonPath("$.orderCode").value(123))
                .andExpect(jsonPath("$.returnUrl").value("https://shop.test/order-success/501"))
                .andExpect(jsonPath("$.cancelUrl").value("https://shop.test/payment/qr/501?cancelled=1"))
                .andExpect(jsonPath("$.signature").value(signatures.hmacSha256(canonical, "fake-checksum")))
                .andRespond(withSuccess(createEnvelope(), MediaType.APPLICATION_JSON));
        var result = client.create(attempt());
        assertEquals("https://pay.payos.vn/web/test-id", result.checkoutUrl());
        assertEquals("QR-PAYMENT-STRING", result.qrPayload());
        assertEquals("test-id", result.paymentLinkId());
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("redirectOrigins")
    void redirectTemplatesKeepConfiguredOriginAndUseInternalIdentity(String origin) {
        ReflectionTestUtils.setField(client, "returnUrl", origin + "/order-success/{orderId}");
        ReflectionTestUtils.setField(client, "cancelUrl", origin + "/payment/qr/{orderId}?cancelled=1");
        String canonical = "amount=100000&cancelUrl=" + origin + "/payment/qr/501?cancelled=1"
                + "&description=BADMINTON&orderCode=123&returnUrl=" + origin + "/order-success/501";
        server.expect(requestTo("https://provider.test/v2/payment-requests"))
                .andExpect(jsonPath("$.returnUrl").value(origin + "/order-success/501"))
                .andExpect(jsonPath("$.cancelUrl").value(origin + "/payment/qr/501?cancelled=1"))
                .andExpect(jsonPath("$.signature").value(signatures.hmacSha256(canonical, "fake-checksum")))
                .andRespond(withSuccess(createEnvelope(), MediaType.APPLICATION_JSON));
        var result = client.create(attempt());
        assertEquals(123L, result.orderCode());
        server.verify();
    }

    @Test
    void applicationTemplatesResolveForLocalDevelopment() {
        var environment = configuredEnvironment(Map.of());
        redirectTemplatesKeepConfiguredOriginAndUseInternalIdentity("http://localhost:5173");
        assertEquals("http://localhost:5173/order-success/{orderId}", environment.getProperty("payos.return-url"));
        assertEquals("http://localhost:5173/payment/qr/{orderId}?cancelled=1", environment.getProperty("payos.cancel-url"));
    }

    @Test
    void environmentOverridesBothTemplatesWithoutChangingJavaDefaults() {
        var environment = configuredEnvironment(Map.of(
                "PAYOS_RETURN_URL", "https://deployment.example/order-success/{orderId}",
                "PAYOS_CANCEL_URL", "https://deployment.example/payment/qr/{orderId}?cancelled=1"));
        assertEquals("https://deployment.example/order-success/{orderId}", environment.getProperty("payos.return-url"));
        assertEquals("https://deployment.example/payment/qr/{orderId}?cancelled=1", environment.getProperty("payos.cancel-url"));
    }

    private ConfigurableEnvironment configuredEnvironment(Map<String, Object> overrides) {
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        var environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new PropertiesPropertySource("application", yaml.getObject()));
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource("test-env", overrides));
        return environment;
    }

    private static Stream<String> redirectOrigins() {
        return Stream.of("http://localhost:5173", "http://127.0.0.1:5173", "https://shop.example:8443");
    }

    @ParameterizedTest
    @MethodSource("invalidOrderIds")
    void invalidInternalIdentityNeverCallsProvider(Long orderId) {
        var attempt = new PaymentAttemptResponse(1L, orderId, "PAYOS", 123L, null, new BigDecimal("100000"),
                "VND", PaymentAttempt.Status.CREATING, null, null, LocalDateTime.now().plusMinutes(15), null, null, null);
        assertEquals(503, assertThrows(PaymentLinkException.class, () -> client.create(attempt)).getStatus());
        server.verify();
    }

    private static Stream<Arguments> invalidOrderIds() {
        return Stream.of(Arguments.of((Object) null), Arguments.of(0L), Arguments.of(-1L));
    }

    @ParameterizedTest
    @MethodSource("invalidRedirectTemplates")
    void invalidRedirectConfigurationNeverCallsProvider(String field, String template) {
        ReflectionTestUtils.setField(client, field, template);
        var error = assertThrows(PaymentLinkException.class, () -> client.create(attempt()));
        assertEquals(503, error.getStatus());
        assertEquals("PAYOS_UNAVAILABLE", error.getCode());
        server.verify();
    }

    private static Stream<Arguments> invalidRedirectTemplates() {
        return Stream.of(
                Arguments.of("returnUrl", null),
                Arguments.of("returnUrl", "https://shop.test/orders/success"),
                Arguments.of("returnUrl", "/order-success/{orderId}"),
                Arguments.of("returnUrl", "ftp://shop.test/order-success/{orderId}"),
                Arguments.of("returnUrl", "https://shop test/order-success/{orderId}"),
                Arguments.of("returnUrl", "https://user:password@shop.test/order-success/{orderId}"),
                Arguments.of("returnUrl", "https://shop.test//order-success/{orderId}"),
                Arguments.of("returnUrl", "https://shop.test/order-success/{orderId}#token"),
                Arguments.of("returnUrl", "https://shop.test/order-success/{orderId}?token=test"),
                Arguments.of("returnUrl", "https://shop.test/order-success/{orderId}/{orderId}"),
                Arguments.of("returnUrl", "https://shop.test:99999/order-success/{orderId}"),
                Arguments.of("cancelUrl", "https://shop.test/orders/cancel"),
                Arguments.of("cancelUrl", "https://shop.test/payment/qr/{orderId}"),
                Arguments.of("cancelUrl", "https://shop.test/payment/qr/{orderId}?cancelled=0"),
                Arguments.of("cancelUrl", "https://shop.test/payment/qr/{orderId}?cancelled=1&token=test"));
    }

    @Test
    void queryNeverSynthesizesCheckoutUrl() {
        String data = "{\"id\":\"test-id\",\"orderCode\":123,\"amount\":100000,\"status\":\"PENDING\"}";
        String canonical = "amount=100000&id=test-id&orderCode=123&status=PENDING";
        server.expect(requestTo("https://provider.test/v2/payment-requests/123"))
                .andExpect(method(HttpMethod.GET)).andRespond(withSuccess(envelope(data, canonical), MediaType.APPLICATION_JSON));
        var result = client.query(123L);
        assertNull(result.checkoutUrl());
        assertNull(result.qrPayload());
        assertEquals("test-id", result.paymentLinkId());
    }

    @Test
    void timeoutsAndConnectivityAreSanitized() {
        server.expect(anything()).andRespond(request -> { throw new SocketTimeoutException("fake secret"); });
        var failure = assertThrows(PaymentLinkException.class, () -> client.create(attempt()));
        assertEquals(504, failure.getStatus());
        assertFalse(failure.getMessage().contains("fake secret"));
    }

    @Test
    void notFoundQueryReturnsUnresolvedAndDoesNotCreate() {
        server.expect(requestTo("https://provider.test/v2/payment-requests/123"))
                .andExpect(method(HttpMethod.GET)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertNull(client.query(123L));
        server.verify();
    }

    @Test
    void forgedSignatureIsRejected() {
        server.expect(anything()).andRespond(withSuccess(createEnvelope().replaceFirst(
                "\"signature\":\"[0-9a-f]+\"", "\"signature\":\"" + "0".repeat(64) + "\""), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(PaymentLinkException.class, () -> client.create(attempt())).getStatus());
    }

    @Test
    void gatewayErrorIsNotSuccess() {
        server.expect(anything()).andRespond(withServerError());
        assertEquals(502, assertThrows(PaymentLinkException.class, () -> client.create(attempt())).getStatus());
    }

    @Test
    void verifiedQueryIncludesActualTransactionsNullAndUnknownFieldsWithoutCurrency() {
        String data = queryData();
        server.expect(requestTo("https://provider.test/v2/payment-requests/123"))
                .andExpect(method(HttpMethod.GET)).andExpect(header("x-client-id", "fake-client"))
                .andExpect(header("x-api-key", "fake-api"))
                .andRespond(withSuccess(envelope(data, queryCanonical()), MediaType.APPLICATION_JSON));
        var result = client.queryPayment(123L);
        assertEquals("PAID", result.status());
        assertEquals(new BigDecimal("100000"), result.amountPaid());
        assertEquals(BigDecimal.ZERO, result.amountRemaining());
        assertEquals("TX-123", result.transactions().get(0).reference());
        assertEquals("2026-10-04T10:00:00", result.transactions().get(0).transactionDateTime());
        server.verify();
    }

    @Test
    void changedUnknownQueryFieldInvalidatesSignatureBeforeParsing() {
        String signed = envelope(queryData(), queryCanonical()).replace("\"future\":null", "\"future\":\"changed\"");
        server.expect(anything()).andRespond(withSuccess(signed, MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(PaymentLinkException.class, () -> client.queryPayment(123L)).getStatus());
    }

    @Test
    void signedQueryWithFractionalTransactionIsRejected() {
        String data = queryData().replace("\"reference\":\"TX-123\",\"amount\":100000", "\"reference\":\"TX-123\",\"amount\":1.5");
        String canonical = queryCanonical().replace("transactions=[{\"amount\":100000", "transactions=[{\"amount\":1.5");
        server.expect(anything()).andRespond(withSuccess(envelope(data, canonical), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(PaymentLinkException.class, () -> client.queryPayment(123L)).getStatus());
    }

    @Test
    void queryTimeout503And429AreMappedToRetryableErrors() {
        for (HttpStatus status : new HttpStatus[]{HttpStatus.SERVICE_UNAVAILABLE, HttpStatus.TOO_MANY_REQUESTS}) {
            server.reset(); server.expect(anything()).andRespond(withStatus(status));
            assertEquals(503, assertThrows(PaymentLinkException.class, () -> client.queryPayment(123L)).getStatus());
        }
        server.reset(); server.expect(anything()).andRespond(request -> { throw new SocketTimeoutException("test-only"); });
        assertEquals(504, assertThrows(PaymentLinkException.class, () -> client.queryPayment(123L)).getStatus());
    }

    private String queryData() {
        return "{\"id\":\"test-id\",\"orderCode\":123,\"amount\":100000,\"amountPaid\":100000,\"amountRemaining\":0,"
                + "\"status\":\"PAID\",\"future\":null,\"transactions\":[{\"reference\":\"TX-123\",\"amount\":100000,"
                + "\"transactionDateTime\":\"2026-10-04T10:00:00\"}]}";
    }

    private String queryCanonical() {
        return "amount=100000&amountPaid=100000&amountRemaining=0&future=&id=test-id&orderCode=123&status=PAID"
                + "&transactions=[{\"amount\":100000,\"reference\":\"TX-123\",\"transactionDateTime\":\"2026-10-04T10:00:00\"}]";
    }

    private String createEnvelope() {
        String data = "{\"amount\":100000,\"currency\":\"VND\",\"orderCode\":123,\"paymentLinkId\":\"test-id\","
                + "\"status\":\"PENDING\",\"checkoutUrl\":\"https://pay.payos.vn/web/test-id\",\"qrCode\":\"QR-PAYMENT-STRING\"}";
        String canonical = "amount=100000&checkoutUrl=https://pay.payos.vn/web/test-id&currency=VND"
                + "&orderCode=123&paymentLinkId=test-id&qrCode=QR-PAYMENT-STRING&status=PENDING";
        return envelope(data, canonical);
    }

    private String envelope(String data, String canonical) {
        return "{\"code\":\"00\",\"data\":" + data + ",\"signature\":\""
                + signatures.hmacSha256(canonical, "fake-checksum") + "\"}";
    }

    private PaymentAttemptResponse attempt() {
        return new PaymentAttemptResponse(1L, 501L, "PAYOS", 123L, null, new BigDecimal("100000"),
                "VND", PaymentAttempt.Status.CREATING, null, null, LocalDateTime.now().plusMinutes(15), null, null, null);
    }
}
