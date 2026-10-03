package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.exception.PaymentLinkException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZoneId;
import java.util.*;

@Component
public class PayOSPaymentClient {
    private final RestTemplate http;
    private final PayOSService signatures;
    private final ObjectMapper json = new ObjectMapper();
    @Value("${payos.client-id}") private String clientId;
    @Value("${payos.api-key}") private String apiKey;
    @Value("${payos.checksum-key}") private String checksumKey;
    @Value("${payos.base-url:https://api-merchant.payos.vn}") private String baseUrl;
    @Value("${payos.return-url}") private String returnUrl;
    @Value("${payos.cancel-url}") private String cancelUrl;

    public record Result(Long orderCode, BigDecimal amount, String paymentLinkId,
            String checkoutUrl, String qrPayload) {}

    public PayOSPaymentClient(PayOSService signatures,
            @Value("${payos.connect-timeout-ms:3000}") int connectTimeout,
            @Value("${payos.read-timeout-ms:10000}") int readTimeout) {
        this.signatures = signatures;
        if (connectTimeout <= 0 || readTimeout <= 0) throw new IllegalArgumentException("Timeout phải hữu hạn");
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        this.http = new RestTemplate(factory);
    }

    public Result create(PaymentAttemptResponse attempt) {
        var payload = json.createObjectNode();
        long amount = VndAmount.requireValid(attempt.amount()).longValueExact();
        payload.put("amount", amount).put("orderCode", attempt.orderCode());
        payload.put("description", "BADMINTON").put("returnUrl", returnUrl).put("cancelUrl", cancelUrl);
        long expires = attempt.expiresAt().atZone(ZoneId.systemDefault()).toEpochSecond();
        payload.put("expiredAt", Math.toIntExact(expires));
        String canonical = "amount=" + amount + "&cancelUrl=" + cancelUrl
                + "&description=BADMINTON&orderCode=" + attempt.orderCode() + "&returnUrl=" + returnUrl;
        payload.put("signature", signatures.hmacSha256(canonical, checksumKey));
        JsonNode data = exchange(HttpMethod.POST, "/v2/payment-requests", payload, false);
        if (!"PENDING".equals(data.path("status").asText()) || !"VND".equals(data.path("currency").asText())) {
            throw invalid();
        }
        String checkout = requiredText(data, "checkoutUrl");
        validateCheckout(checkout);
        return result(data, "paymentLinkId", checkout, data.path("qrCode").isTextual()
                ? data.get("qrCode").asText() : null);
    }

    public Result query(Long orderCode) {
        JsonNode data = exchange(HttpMethod.GET, "/v2/payment-requests/" + orderCode, null, true);
        if (data == null) return null;
        return result(data, "id", null, null);
    }

    private Result result(JsonNode data, String idField, String checkout, String qr) {
        if (!data.path("orderCode").isIntegralNumber() || !data.path("amount").isIntegralNumber()
                || !data.get("orderCode").canConvertToLong()) throw invalid();
        BigDecimal amount = data.get("amount").decimalValue();
        VndAmount.requireValid(amount).longValueExact();
        return new Result(data.get("orderCode").longValue(), amount, requiredText(data, idField), checkout, qr);
    }

    private JsonNode exchange(HttpMethod method, String path, JsonNode body, boolean query) {
        try {
            var response = http.exchange(baseUrl + path, method, new HttpEntity<>(body, headers()), JsonNode.class);
            JsonNode envelope = response.getBody();
            if (envelope == null || !"00".equals(envelope.path("code").asText())) throw invalid();
            JsonNode data = envelope.get("data");
            verify(data, envelope.path("signature").asText());
            return data;
        } catch (HttpStatusCodeException ex) {
            if (query && ex.getStatusCode().value() == 404) return null;
            int status = ex.getStatusCode().value() == 429 ? 503 : 502;
            throw failure(status);
        } catch (ResourceAccessException ex) {
            Throwable cause = ex;
            while (cause.getCause() != null) cause = cause.getCause();
            throw failure(cause instanceof SocketTimeoutException ? 504 : 503);
        } catch (RestClientException ex) {
            throw invalid();
        }
    }

    private HttpHeaders headers() {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        return headers;
    }

    private void verify(JsonNode data, String signature) {
        if (data == null || !data.isObject() || !signature.matches("[0-9a-fA-F]{64}")) throw invalid();
        var values = new TreeMap<String, String>();
        data.fields().forEachRemaining(e -> values.put(e.getKey(), canonicalValue(e.getValue())));
        String canonical = String.join("&", values.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue()).toList());
        String expected = signatures.hmacSha256(canonical, checksumKey);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8))) throw invalid();
    }

    private String canonicalValue(JsonNode value) {
        if (value.isNull() || value.isTextual() && Set.of("null", "undefined").contains(value.asText())) return "";
        if (value.isArray()) {
            ArrayNode sorted = json.createArrayNode();
            value.forEach(item -> sorted.add(sortObject(item)));
            return sorted.toString();
        }
        return value.isContainerNode() ? value.toString() : value.asText();
    }

    private JsonNode sortObject(JsonNode value) {
        if (!value.isObject()) throw invalid();
        ObjectNode sorted = json.createObjectNode();
        var fields = new TreeMap<String, JsonNode>();
        value.fields().forEachRemaining(e -> fields.put(e.getKey(), e.getValue()));
        fields.forEach(sorted::set);
        return sorted;
    }

    private String requiredText(JsonNode data, String field) {
        JsonNode value = data.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank()) throw invalid();
        return value.asText();
    }

    private void validateCheckout(String value) {
        try {
            URI uri = URI.create(value);
            if (!"https".equals(uri.getScheme()) || !"pay.payos.vn".equals(uri.getHost())
                    || uri.getUserInfo() != null || uri.getPort() != -1) throw invalid();
        } catch (IllegalArgumentException ex) {
            throw invalid();
        }
    }

    private PaymentLinkException invalid() {
        return new PaymentLinkException(502, "PAYOS_INVALID_RESPONSE", "Phản hồi thanh toán không hợp lệ");
    }

    private PaymentLinkException failure(int status) {
        return new PaymentLinkException(status, "PAYOS_UNAVAILABLE", "Chưa thể kết nối cổng thanh toán; thử lại trên cùng đơn");
    }
}
