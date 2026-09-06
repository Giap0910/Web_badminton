package com.sports.service;

import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class PayOSSecurityTest {

    private PayOSService payosService;
    private final String testChecksumKey = "d65c40ba7368d18b2c4e673a5a73e3a9c735d487293b6e7090886101c5cb86b7";

    @BeforeEach
    void setUp() {
        payosService = new PayOSService();
        ReflectionTestUtils.setField(payosService, "checksumKey", testChecksumKey);
        ReflectionTestUtils.setField(payosService, "returnUrl", "http://localhost:5173/orders/success");
        ReflectionTestUtils.setField(payosService, "cancelUrl", "http://localhost:5173/orders/cancel");
    }

    @Test
    @DisplayName("Bảo mật chữ ký số: Chữ ký HMAC-SHA256 hợp lệ được xác thực thành công")
    void testVerifyWebhookSignature_ValidSignature() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertTrue(isValid, "Chữ ký số hợp lệ phải được chấp nhận");
    }

    @Test
    @DisplayName("Chống giả mạo: Từ chối dứt khoát nếu chữ ký HMAC-SHA256 bị sai lệch hoặc giả mạo")
    void testVerifyWebhookSignature_TamperedSignature() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        // Cố tình sửa chữ ký giả mạo
        mockWebhook.setSignature("bad_fake_signature_abc1234567890abcdef");

        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertFalse(isValid, "Chữ ký giả mạo phải bị từ chối ngay lập tức");
    }

    @Test
    @DisplayName("Chống Parameter Tampering: Dữ liệu thanh toán bị sửa giá sẽ làm sai lệch HMAC-SHA256")
    void testVerifyWebhookSignature_TamperedAmount() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        // Hacker sửa giá từ 4.250.000 xuống 1.000 VNĐ nhưng giữ nguyên chữ ký cũ
        mockWebhook.getData().setAmount(new BigDecimal("1000"));

        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertFalse(isValid, "Thay đổi số tiền trong payload mà không có secret key phải làm hỏng chữ ký");
    }
}
