package com.sports.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.security.CustomUserDetails;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.Map;

@RestController @RequestMapping("/api/admin/payments") @RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminPaymentController {
    private final AdminPaymentService payments;
    private final PaymentReconciliationService reconciliations;

    @GetMapping
    public ResponseEntity<Object> getAllPayments(@RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size, @RequestParam(defaultValue = "") String query,
            @RequestParam(required = false) String status, @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(payments.list(page, size, query, status, sortBy, sortDir));
    }

    @PostMapping("/{id}/reconcile")
    public ResponseEntity<PaymentAttemptResponse> reconcile(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails admin, @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestBody(required = false) JsonNode body) {
        var result = reconciliations.reconcile(id, admin.getId(), key, body);
        return ResponseEntity.status(result.status()).body(result.attempt());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> malformedJson(jakarta.servlet.http.HttpServletRequest request) {
        return error(400, "INVALID_RECONCILIATION", "Dữ liệu JSON không hợp lệ", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> invalidParameter(jakarta.servlet.http.HttpServletRequest request) {
        return error(400, "INVALID_PAYMENT_REQUEST", "Tham số giao dịch không hợp lệ", request);
    }

    @ExceptionHandler({DataAccessException.class, TransactionException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, Object>> storageFailure(jakarta.servlet.http.HttpServletRequest request) {
        return error(500, "PAYMENT_PROCESSING_FAILED", "Chưa thể ghi nhận kết quả thanh toán", request);
    }

    private ResponseEntity<Map<String, Object>> error(int status, String code, String message,
            jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of("timestamp", java.time.OffsetDateTime.now().toString(),
                "status", status, "code", code, "message", message, "path", request.getRequestURI(), "errors", Map.of()));
    }
}
