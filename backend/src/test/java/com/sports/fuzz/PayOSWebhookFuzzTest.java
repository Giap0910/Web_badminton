package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;
import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import com.sports.service.PayOSService;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * White-box Fuzzing Test cho bộ giải mã Webhook PayOS.
 * Bắn dữ liệu rác, byte ngẫu nhiên, payload HMAC dị dạng để kiểm tra độ bền của hệ thống.
 */
public class PayOSWebhookFuzzTest {

    private static final PayOSService payosService = new PayOSService();

    static {
        ReflectionTestUtils.setField(payosService, "checksumKey", "d65c40ba7368d18b2c4e673a5a73e3a9c735d487293b6e7090886101c5cb86b7");
        ReflectionTestUtils.setField(payosService, "returnUrl", "http://localhost:5173/orders/success");
        ReflectionTestUtils.setField(payosService, "cancelUrl", "http://localhost:5173/orders/cancel");
    }

    @FuzzTest
    public void fuzzWebhookVerification(FuzzedDataProvider data) {
        String code = data.consumeString(20);
        String desc = data.consumeString(50);
        long orderCode = data.consumeLong();
        long amountLong = data.consumeLong();
        String signature = data.consumeRemainingAsString();

        PayOSWebhookData webhookData = PayOSWebhookData.builder()
                .orderCode(orderCode)
                .amount(BigDecimal.valueOf(amountLong))
                .description(desc)
                .code(code)
                .build();

        PayOSWebhookRequest request = PayOSWebhookRequest.builder()
                .code(code)
                .desc(desc)
                .data(webhookData)
                .signature(signature)
                .build();

        try {
            // Xác minh hàm verifyWebhookSignature không bao giờ văng unhandled crash
            boolean result = payosService.verifyWebhookSignature(request);
            // Dữ liệu ngẫu nhiên gần như 100% là chữ ký sai lệch
            // Kiểm tra hệ thống xử lý an toàn
        } catch (Exception e) {
            // Không được phép văng NPE hoặc lỗi chưa kiểm soát
            org.junit.jupiter.api.Assertions.fail("Hàm verifyWebhookSignature bị văng ngoại lệ chưa kiểm soát: " + e.getMessage());
        }
    }
}
