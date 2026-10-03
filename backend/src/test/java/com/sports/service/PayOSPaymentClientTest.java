package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.PaymentAttempt;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.LocalDateTime;
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
        ReflectionTestUtils.setField(client, "returnUrl", "https://shop.test/return");
        ReflectionTestUtils.setField(client, "cancelUrl", "https://shop.test/cancel");
        server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(client, "http")).build();
    }

    @Test
    void exactCreateRequestAndSignedResponse() {
        String canonical = "amount=100000&cancelUrl=https://shop.test/cancel&description=BADMINTON"
                + "&orderCode=123&returnUrl=https://shop.test/return";
        server.expect(requestTo("https://provider.test/v2/payment-requests"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("x-api-key", "fake-api"))
                .andExpect(jsonPath("$.amount").value(100000)).andExpect(jsonPath("$.orderCode").value(123))
                .andExpect(jsonPath("$.signature").value(signatures.hmacSha256(canonical, "fake-checksum")))
                .andRespond(withSuccess(createEnvelope(), MediaType.APPLICATION_JSON));
        var result = client.create(attempt());
        assertEquals("https://pay.payos.vn/web/test-id", result.checkoutUrl());
        assertEquals("QR-PAYMENT-STRING", result.qrPayload());
        assertEquals("test-id", result.paymentLinkId());
        server.verify();
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
        return new PaymentAttemptResponse(1L, 2L, "PAYOS", 123L, null, new BigDecimal("100000"),
                "VND", PaymentAttempt.Status.CREATING, null, null, LocalDateTime.now().plusMinutes(15), null, null, null);
    }
}
