package com.sports.mockpayos;

import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import java.math.BigDecimal;
import java.util.Map;

@RestController @Profile("dev & mock-payos")
@ConditionalOnProperty(name={"payos.mock-verified","payos.mock-enabled"},havingValue="true")
public class MockPayOSLegacyController {
    private final MockPayOSLegacyService service;
    public MockPayOSLegacyController(MockPayOSLegacyService service) { this.service=service; }
    @PostMapping("/api/payment/mock-webhook-trigger") @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String,Object>> trigger(@RequestParam Long orderCode,@RequestParam BigDecimal amount) {
        return service.trigger(orderCode,amount);
    }
    @ExceptionHandler(com.sports.exception.PaymentLinkException.class)
    public ResponseEntity<Map<String,Object>> paymentError(com.sports.exception.PaymentLinkException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of("error",ex.getStatus()==401?-1:1,
                "message",ex.getStatus()==401?"Chữ ký không hợp lệ":"Không thể xử lý"));
    }
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String,Object>> unexpected(RuntimeException ex) {
        return ResponseEntity.internalServerError().body(Map.of("error",1,"message","Không thể xử lý"));
    }
}
