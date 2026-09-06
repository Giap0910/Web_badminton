package com.sports.controller;

import com.sports.dto.PayOSWebhookRequest;
import com.sports.exception.BadRequestException;
import com.sports.service.OrderService;
import com.sports.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayOSService payosService;
    private final OrderService orderService;

    /**
     * Standard PayOS Webhook Endpoint.
     * Verifies HMAC-SHA256 signature and reconciles amount with database.
     */
    @PostMapping("/payos-webhook")
    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(@RequestBody PayOSWebhookRequest request) {
        log.info("[PAYOS WEBHOOK] Nhận tín hiệu thanh toán: OrderCode={}, Amount={}",
                request.getData() != null ? request.getData().getOrderCode() : "null",
                request.getData() != null ? request.getData().getAmount() : "null");

        // 1. Verify HMAC-SHA256 Digital Signature
        boolean isValidSignature = payosService.verifyWebhookSignature(request);
        if (!isValidSignature) {
            log.error("[PAYOS WEBHOOK] CHỮ KÝ HMAC-SHA256 KHÔNG HỢP LỆ! Từ chối xử lý.");
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", -1);
            errorResponse.put("message", "Chữ ký số không hợp lệ");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 2. Process payment & reconcile amount against database
        try {
            Long orderCode = request.getData().getOrderCode();
            BigDecimal amount = request.getData().getAmount();
            orderService.handlePaymentSuccess(orderCode, amount);

            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("error", 0);
            successResponse.put("message", "Webhook xử lý thành công");
            successResponse.put("data", null);
            return ResponseEntity.ok(successResponse);
        } catch (BadRequestException e) {
            log.error("[PAYOS WEBHOOK] Lỗi đối soát: {}", e.getMessage());
            Map<String, Object> failResponse = new HashMap<>();
            failResponse.put("error", 1);
            failResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(failResponse);
        } catch (Exception e) {
            log.error("[PAYOS WEBHOOK] Lỗi nội bộ hệ thống: {}", e.getMessage());
            Map<String, Object> failResponse = new HashMap<>();
            failResponse.put("error", 1);
            failResponse.put("message", "Lỗi nội bộ hệ thống");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(failResponse);
        }
    }

    /**
     * Mock Webhook Trigger for 100% Localhost Testing without Ngrok.
     * Generates a fully-signed HMAC-SHA256 payload and triggers payment confirmation.
     */
    @PostMapping("/mock-webhook-trigger")
    public ResponseEntity<Map<String, Object>> triggerMockWebhook(
            @RequestParam Long orderCode,
            @RequestParam BigDecimal amount
    ) {
        log.info("[MOCK WEBHOOK TRIGGER] Khởi tạo thanh toán giả lập localhost: OrderCode={}, Amount={}", orderCode, amount);

        PayOSWebhookRequest mockRequest = payosService.generateMockWebhook(orderCode, amount);
        return handlePayOSWebhook(mockRequest);
    }
}
