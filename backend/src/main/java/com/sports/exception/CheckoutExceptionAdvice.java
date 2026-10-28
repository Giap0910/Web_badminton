package com.sports.exception;

import com.sports.controller.CheckoutController;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice(assignableTypes = CheckoutController.class) @Order(Ordered.HIGHEST_PRECEDENCE)
public class CheckoutExceptionAdvice {
    @ExceptionHandler(PaymentLinkException.class)
    public ResponseEntity<Map<String, Object>> payment(PaymentLinkException ex, HttpServletRequest request) {
        return reply(ex.getStatus(), ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> unreadable(Exception ex, HttpServletRequest request) {
        return reply(400, "INVALID_TRANSITION_INPUT", "Dữ liệu JSON không hợp lệ", request);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> invalidId(Exception ex, HttpServletRequest request) {
        return reply(400, "INVALID_ORDER_ID", "Mã đơn không hợp lệ", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception ex, HttpServletRequest request) {
        return reply(500, "INTERNAL_ERROR", "Không thể xử lý yêu cầu, hãy kiểm tra lại trạng thái đơn", request);
    }

    private ResponseEntity<Map<String, Object>> reply(int status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of("timestamp", OffsetDateTime.now().toString(), "status", status,
                "code", code, "message", message, "path", request.getRequestURI(), "errors", Map.of()));
    }
}

