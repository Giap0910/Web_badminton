package com.sports.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.dto.PayOSWebhookRequest;
import com.sports.exception.PaymentLinkException;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/api/payment") @RequiredArgsConstructor @Slf4j
public class PaymentController {
    private final PayOSService payosService;
    private final PaymentWebhookService webhooks;
    private final Environment environment;
    @Value("${payos.mock-enabled:false}") private boolean mockEnabled;

    @PostMapping("/payos-webhook")
    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(@RequestBody JsonNode request) {
        try {
            webhooks.accept(request);
            var result = new HashMap<String, Object>();
            result.put("error", 0);
            result.put("message", "Đã tiếp nhận");
            result.put("data", null);
            return ResponseEntity.ok(result);
        } catch (PaymentLinkException ex) {
            if (ex.getStatus() == 401) return ResponseEntity.status(401).body(Map.of("error", -1, "message", "Chữ ký không hợp lệ"));
            return failure(ex.getStatus() == 400 ? 400 : 500);
        } catch (RuntimeException ex) {
            log.warn("Không thể ghi nhận webhook thanh toán: {}", ex.getClass().getSimpleName());
            return failure(500);
        }
    }

    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(PayOSWebhookRequest request) {
        return handlePayOSWebhook(request == null ? null : payosService.webhookPayload(request));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> malformedJson() {
        return failure(400);
    }

    private ResponseEntity<Map<String, Object>> failure(int status) {
        return ResponseEntity.status(status).body(Map.of("error", 1, "message", "Không thể xử lý"));
    }

    @PostMapping("/mock-webhook-trigger") @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> triggerMockWebhook(@RequestParam Long orderCode, @RequestParam BigDecimal amount) {
        if (!mockEnabled || !environment.acceptsProfiles(Profiles.of("dev"))) {
            return ResponseEntity.status(404).body(Map.of("error", 1, "message", "Thanh toán giả lập đã tắt"));
        }
        return handlePayOSWebhook(payosService.generateMockWebhook(orderCode, amount));
    }
}
