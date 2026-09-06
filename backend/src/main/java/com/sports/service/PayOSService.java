package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayOSService {

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    @Value("${payos.return-url:http://localhost:5173/orders/success}")
    private String returnUrl;

    @Value("${payos.cancel-url:http://localhost:5173/orders/cancel}")
    private String cancelUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Computes HMAC-SHA256 signature for given data string and secret key.
     */
    public String hmacSha256(String data, String key) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi sinh chữ ký HMAC-SHA256", e);
        }
    }

    /**
     * Generates PayOS Payment Link signature:
     * "amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}"
     */
    public String createSignatureForPaymentLink(Long orderCode, BigDecimal amount, String description) {
        String data = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount.longValue(), cancelUrl, description, orderCode, returnUrl);
        return hmacSha256(data, checksumKey);
    }

    /**
     * Verifies HMAC-SHA256 signature of an incoming PayOS Webhook request.
     * PayOS Webhook signature is computed from sorted key-value pairs of data:
     * key1=value1&key2=value2...
     */
    public boolean verifyWebhookSignature(PayOSWebhookRequest request) {
        if (request == null || request.getData() == null || request.getSignature() == null) {
            return false;
        }

        try {
            PayOSWebhookData data = request.getData();
            // PayOS signs the data fields in alphabetical order
            // Format: amount={amount}&code={code}&desc={desc}&orderCode={orderCode}&reference={reference}
            // Sort map of non-null fields
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.convertValue(data, Map.class);
            TreeMap<String, Object> sortedMap = new TreeMap<>();
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (entry.getValue() != null) {
                    sortedMap.put(entry.getKey(), entry.getValue());
                }
            }

            StringBuilder dataStr = new StringBuilder();
            for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
                if (dataStr.length() > 0) {
                    dataStr.append("&");
                }
                dataStr.append(entry.getKey()).append("=").append(entry.getValue());
            }

            String expectedSignature = hmacSha256(dataStr.toString(), checksumKey);
            return MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    request.getSignature().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra chữ ký Webhook: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generates a valid Mock Webhook request for local testing without ngrok.
     */
    public PayOSWebhookRequest generateMockWebhook(Long orderCode, BigDecimal amount) {
        PayOSWebhookData data = PayOSWebhookData.builder()
                .orderCode(orderCode)
                .amount(amount)
                .description("Thanh toan don hang " + orderCode)
                .accountNumber("0987654321")
                .reference("MOCK_REF_" + System.currentTimeMillis())
                .transactionDateTime("2026-09-07 03:00:00")
                .currency("VND")
                .paymentLinkId("MOCK_LINK_" + orderCode)
                .code("00")
                .desc("Thanh toan thanh cong")
                .build();

        @SuppressWarnings("unchecked")
        Map<String, Object> map = objectMapper.convertValue(data, Map.class);
        TreeMap<String, Object> sortedMap = new TreeMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null) {
                sortedMap.put(entry.getKey(), entry.getValue());
            }
        }

        StringBuilder dataStr = new StringBuilder();
        for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
            if (dataStr.length() > 0) {
                dataStr.append("&");
            }
            dataStr.append(entry.getKey()).append("=").append(entry.getValue());
        }

        String signature = hmacSha256(dataStr.toString(), checksumKey);

        return PayOSWebhookRequest.builder()
                .code("00")
                .desc("Success")
                .data(data)
                .signature(signature)
                .build();
    }
}
