package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sports.entity.PaymentEvent;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentWebhookContractTest {
    private final ObjectMapper json = new ObjectMapper();
    private final PayOSService signatures = new PayOSService();
    private final PaymentSettlementService settlement = mock(PaymentSettlementService.class);
    private final PaymentWebhookService webhook = new PaymentWebhookService(signatures, settlement);
    private static final String KEY = "fix003-fixture-only-key";

    @BeforeEach
    void configure() { ReflectionTestUtils.setField(signatures, "checksumKey", KEY); }

    @Test
    void independentGoldenVectorIncludesNullUnknownFieldsAndSortedArrayObjects() throws Exception {
        var data = json.readTree("""
                {"reference":"REF-123","items":[{"b":2,"a":1}],"extra":null,
                 "description":"Đơn thử","orderCode":123,"code":"00","amount":100000}
                """);
        assertEquals("amount=100000&code=00&description=Đơn thử&extra=&items=[{\"a\":1,\"b\":2}]&orderCode=123&reference=REF-123",
                signatures.canonicalData(data));
        String vector = "2e344f0c7b9bacf4f1adfd29328b895049e6b91c42450215ec56931989ccc1da";
        assertTrue(signatures.verifyDataSignature(data, vector, KEY));
        ((ObjectNode) data).remove("extra");
        assertFalse(signatures.verifyDataSignature(data, vector, KEY));
    }

    @Test
    void literalNullAndUndefinedAreNotJsonNullAndArrayOrderIsPreserved() throws Exception {
        var data = json.readTree("{\"z\":null,\"b\":\"undefined\",\"a\":\"null\",\"rows\":[{\"x\":2},{\"x\":1}]}");
        assertEquals("a=null&b=undefined&rows=[{\"x\":2},{\"x\":1}]&z=", signatures.canonicalData(data));
    }

    @Test
    void signedUnknownAndNullFieldsReachVerificationWithoutDtoLoss() {
        var payload = payload();
        ((ObjectNode) payload.get("data")).putNull("futureBankField").put("futureField", "verified");
        sign(payload);
        webhook.accept(payload);
        verify(settlement).webhook(argThat(p -> p.successful() && p.amount().compareTo(new BigDecimal("100000")) == 0));
        ((ObjectNode) payload.get("data")).put("futureField", "changed");
        assertEquals(401, assertThrows(PaymentLinkException.class, () -> webhook.accept(payload)).getStatus());
        verifyNoMoreInteractions(settlement);
    }

    @Test
    void rootSuccessCannotOverrideSignedNonSuccessCode() {
        var payload = payload();
        ((ObjectNode) payload.get("data")).put("code", "99");
        sign(payload);
        webhook.accept(payload);
        verify(settlement).webhook(argThat(p -> !p.successful()));
    }

    @Test
    void missingSuccessFractionalAmountAndMissingIdentifierAreMalformed() {
        for (String field : new String[]{"success", "reference", "paymentLinkId"}) {
            var payload = payload();
            if (field.equals("success")) payload.remove(field); else ((ObjectNode) payload.get("data")).remove(field);
            assertEquals(400, assertThrows(PaymentLinkException.class, () -> webhook.accept(payload)).getStatus());
        }
        var payload = payload();
        ((ObjectNode) payload.get("data")).put("amount", new BigDecimal("1.5"));
        assertEquals(400, assertThrows(PaymentLinkException.class, () -> webhook.accept(payload)).getStatus());
        verifyNoInteractions(settlement);
    }

    @Test
    void missingSignatureIsMalformedButInvalidHexIsUnauthorized() {
        var payload = payload();
        payload.remove("signature");
        assertEquals(400, assertThrows(PaymentLinkException.class, () -> webhook.accept(payload)).getStatus());
        payload.put("signature", "bad-signature");
        assertEquals(401, assertThrows(PaymentLinkException.class, () -> webhook.accept(payload)).getStatus());
        verifyNoInteractions(settlement);
    }

    @Test
    void timePolicyUsesMerchantZoneAndPreservesRawProviderValue() {
        var evidence = new PaymentEvidence("link", 123L, "ref", BigDecimal.ONE, "VND",
                "2026-10-04T03:00:00Z", true, PaymentEvent.Source.WEBHOOK);
        assertEquals("2026-10-04T10:00", evidence.paidAt().toString());
        assertEquals("2026-10-04T03:00:00Z", evidence.transactionDateTime());
        var invalid = new PaymentEvidence("link", 123L, "ref", BigDecimal.ONE, "VND",
                "not-a-time", true, PaymentEvent.Source.WEBHOOK);
        assertNull(invalid.paidAt());
    }

    private ObjectNode payload() {
        var data = json.createObjectNode().put("amount", 100000).put("orderCode", 123);
        data.put("reference", "REF-123").put("paymentLinkId", "link-123").put("currency", "VND");
        data.put("transactionDateTime", "2026-10-04T10:00:00").put("code", "00");
        data.put("description", "Đơn thử").put("accountNumber", "test-only").put("desc", "Thành công");
        var payload = json.createObjectNode().put("code", "00").put("desc", "Thành công").put("success", true);
        payload.set("data", data);
        sign(payload);
        return payload;
    }

    private void sign(ObjectNode payload) {
        payload.put("signature", signatures.hmacSha256(signatures.canonicalData(payload.get("data")), KEY));
    }
}
