package com.sports.service;

import com.fasterxml.jackson.databind.*;
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
import java.time.ZoneId;
import java.util.*;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "payos.mode", havingValue = "REAL", matchIfMissing = true)
public class PayOSPaymentClient implements PayOSGateway {
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
            String checkoutUrl, String qrPayload, boolean verifiedPendingRecovery) {
        public Result(Long orderCode, BigDecimal amount, String paymentLinkId, String checkoutUrl, String qrPayload) {
            this(orderCode, amount, paymentLinkId, checkoutUrl, qrPayload, false);
        }
    }
    public record Transaction(String reference, BigDecimal amount, String transactionDateTime) {}
    public record Query(Long orderCode, BigDecimal amount, String paymentLinkId, String status,
            BigDecimal amountPaid, BigDecimal amountRemaining, List<Transaction> transactions) {}

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
        String resolvedReturn = resolveRedirect(returnUrl, attempt.orderId(), "/order-success/", null);
        String resolvedCancel = resolveRedirect(cancelUrl, attempt.orderId(), "/payment/qr/", "cancelled=1");
        payload.put("amount", amount).put("orderCode", attempt.orderCode());
        payload.put("description", "BADMINTON").put("returnUrl", resolvedReturn).put("cancelUrl", resolvedCancel);
        long expires = attempt.expiresAt().atZone(ZoneId.systemDefault()).toEpochSecond();
        payload.put("expiredAt", Math.toIntExact(expires));
        String canonical = "amount=" + amount + "&cancelUrl=" + resolvedCancel
                + "&description=BADMINTON&orderCode=" + attempt.orderCode() + "&returnUrl=" + resolvedReturn;
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

    private String resolveRedirect(String template, Long orderId, String path, String query) {
        if (orderId == null || orderId <= 0 || template == null || !template.contains("{orderId}")
                || template.indexOf("{orderId}") != template.lastIndexOf("{orderId}")) throw failure(503);
        String resolved = template.replace("{orderId}", orderId.toString());
        try {
            URI uri = URI.create(resolved);
            if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                    || uri.getPort() == 0 || uri.getPort() > 65535
                    || !(path + orderId).equals(uri.getRawPath()) || !Objects.equals(query, uri.getRawQuery())) {
                throw failure(503);
            }
        } catch (IllegalArgumentException ex) {
            throw failure(503);
        }
        return resolved;
    }

    public Result query(Long orderCode) {
        JsonNode data = exchange(HttpMethod.GET, "/v2/payment-requests/" + orderCode, null, true);
        if (data == null) return null;
        var proof = paymentQuery(data);
        if (!Objects.equals(orderCode, proof.orderCode())) throw invalid();
        String checkout = recoveryCheckout(data, proof);
        var result = result(data, "id", checkout, null);
        return new Result(result.orderCode(), result.amount(), result.paymentLinkId(), checkout, null, checkout != null);
    }

    private String recoveryCheckout(JsonNode data, Query proof) {
        if (!"PENDING".equals(proof.status()) || proof.amountPaid().signum() != 0
                || proof.amountRemaining().compareTo(proof.amount()) != 0 || !proof.transactions().isEmpty()) return null;
        if (!proof.paymentLinkId().matches("[0-9a-fA-F]{32}")) throw invalid();
        String checkout = "https://pay.payos.vn/web/" + proof.paymentLinkId();
        if (data.hasNonNull("checkoutUrl") && !checkout.equals(requiredText(data, "checkoutUrl"))) throw invalid();
        validateCheckout(checkout);
        return checkout;
    }

    public Query queryPayment(Long orderCode) {
        JsonNode data = exchange(HttpMethod.GET, "/v2/payment-requests/" + orderCode, null, true);
        if (data == null) return null;
        return paymentQuery(data);
    }

    public Query cancelPayment(Long orderCode) {
        var payload = json.createObjectNode().put("cancellationReason", "FIX-057: chuyển sang COD");
        return paymentQuery(exchange(HttpMethod.POST, "/v2/payment-requests/" + orderCode + "/cancel", payload, false));
    }

    private Query paymentQuery(JsonNode data) {
        if (!data.path("transactions").isArray()) throw invalid();
        List<Transaction> transactions = new ArrayList<>();
        for (JsonNode row : data.get("transactions")) {
            transactions.add(new Transaction(requiredText(row, "reference"), integer(row, "amount"),
                    requiredText(row, "transactionDateTime")));
        }
        return new Query(integer(data, "orderCode").longValueExact(), integer(data, "amount"),
                requiredText(data, "id"), requiredText(data, "status"), integer(data, "amountPaid"),
                integer(data, "amountRemaining"), List.copyOf(transactions));
    }

    private BigDecimal integer(JsonNode data, String field) {
        if (!data.path(field).isIntegralNumber() || !data.get(field).canConvertToLong()) throw invalid();
        return data.get(field).decimalValue();
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
            return verifiedData(response.getBody());
        } catch (HttpStatusCodeException ex) {
            if (query && ex.getStatusCode().value() == 404) return null;
            int status = ex.getStatusCode().value() == 429 || ex.getStatusCode().value() == 503 ? 503 : 502;
            throw failure(status);
        } catch (ResourceAccessException ex) {
            if (requestNotSent(ex)) throw new PaymentLinkException(503, "PAYOS_CONNECTION_NOT_ESTABLISHED",
                    "Không kết nối được PayOS; yêu cầu chưa được gửi. Vui lòng kiểm tra lại sau.");
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
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set(HttpHeaders.USER_AGENT, "HG-Badminton/1.0 (PayOS integration)");
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        return headers;
    }

    private boolean requestNotSent(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.net.ConnectException || cause instanceof java.net.UnknownHostException
                    || cause instanceof java.net.NoRouteToHostException) return true;
            if ((cause instanceof SocketTimeoutException || cause instanceof javax.net.ssl.SSLHandshakeException)
                    && java.util.Arrays.stream(cause.getStackTrace()).anyMatch(frame ->
                            frame.getClassName().equals("sun.net.www.protocol.https.HttpsURLConnectionImpl")
                                    && frame.getMethodName().equals("connect"))) return true;
        }
        return false;
    }

    private JsonNode verifiedData(JsonNode envelope) {
        if (envelope == null) throw invalid();
        if ("214".equals(envelope.path("code").asText())) {
            throw new PaymentLinkException(503, "PAYOS_CHANNEL_UNAVAILABLE",
                    "Thanh toán QR chưa sẵn sàng; vui lòng chọn COD hoặc liên hệ cửa hàng.");
        }
        if (!"00".equals(envelope.path("code").asText())) throw invalid();
        JsonNode data = envelope.get("data");
        verify(data, envelope.path("signature").asText());
        return data;
    }

    private void verify(JsonNode data, String signature) {
        if (!signatures.verifyDataSignature(data, signature, checksumKey)) throw invalid();
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
