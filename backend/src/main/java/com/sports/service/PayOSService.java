package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sports.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PayOSService {
    @Value("${payos.checksum-key}") private String checksumKey;
    @Value("${payos.return-url:http://localhost:5173/orders/success}") private String returnUrl;
    @Value("${payos.cancel-url:http://localhost:5173/orders/cancel}") private String cancelUrl;
    private final ObjectMapper json = new ObjectMapper();

    public String hmacSha256(String data, String key) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) { throw new IllegalStateException("Không thể tạo chữ ký thanh toán", ex); }
    }

    public String createSignatureForPaymentLink(Long code, BigDecimal amount, String description) {
        long exact = VndAmount.requireValid(amount).longValueExact();
        return hmacSha256("amount=" + exact + "&cancelUrl=" + cancelUrl + "&description=" + description
                + "&orderCode=" + code + "&returnUrl=" + returnUrl, checksumKey);
    }

    public boolean verifyWebhookSignature(PayOSWebhookRequest request) {
        return request != null && verifyWebhookPayload(webhookPayload(request));
    }

    public boolean verifyWebhookPayload(JsonNode request) {
        return request != null && verifyDataSignature(request.get("data"), request.path("signature").asText(), checksumKey);
    }

    public boolean verifyDataSignature(JsonNode data, String signature, String key) {
        if (data == null || !data.isObject() || signature == null || !signature.matches("[0-9a-fA-F]{64}")) return false;
        try {
            String expected = hmacSha256(canonicalData(data), key);
            return MessageDigest.isEqual(HexFormat.of().parseHex(expected), HexFormat.of().parseHex(signature));
        } catch (RuntimeException ex) { return false; }
    }

    public String canonicalData(JsonNode data) {
        Map<String, Object> values = json.convertValue(data, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        var sorted = new TreeMap<>(values);
        var result = new StringJoiner("&");
        sorted.forEach((key, value) -> result.add(key + "=" + canonicalValue(value)));
        return result.toString();
    }

    private String canonicalValue(Object value) {
        if (value == null) return "";
        if (!(value instanceof List<?> list)) return value.toString();
        var sorted = list.stream().map(this::sortedObject).toList();
        try { return json.writeValueAsString(sorted); }
        catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalArgumentException(ex); }
    }

    private Object sortedObject(Object value) {
        Map<String, Object> fields = json.convertValue(value, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        return new TreeMap<>(fields);
    }

    public JsonNode webhookPayload(PayOSWebhookRequest request) {
        ObjectNode payload = json.valueToTree(request);
        if (request.getData() != null && request.getData().getAmount() != null
                && request.getData().getAmount().stripTrailingZeros().scale() <= 0) {
            ((ObjectNode) payload.get("data")).put("amount", request.getData().getAmount().toBigIntegerExact());
        }
        return payload;
    }

    public PayOSWebhookRequest generateMockWebhook(Long code, BigDecimal amount) {
        var data = PayOSWebhookData.builder().orderCode(code).amount(amount).description("Thanh toán giả lập")
                .accountNumber("TEST-ONLY").reference("MOCK_" + UUID.randomUUID())
                .transactionDateTime(LocalDateTime.now().toString()).currency("VND")
                .paymentLinkId("MOCK_LINK_" + code).code("00").desc("Giả lập").build();
        var request = PayOSWebhookRequest.builder().code("00").desc("Giả lập").success(true).data(data).build();
        request.setSignature(hmacSha256(canonicalData(webhookPayload(request).get("data")), checksumKey));
        return request;
    }
}
