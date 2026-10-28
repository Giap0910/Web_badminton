package com.sports.mockpayos;

import com.sports.controller.PaymentEnvironmentController;
import com.sports.exception.PaymentLinkException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice(assignableTypes={MockPayOSController.class,PaymentEnvironmentController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MockPayOSExceptionAdvice {
    @ExceptionHandler(PaymentLinkException.class)
    public ResponseEntity<?> payment(PaymentLinkException ex,HttpServletRequest request) {
        return reply(ex.getStatus(),ex.getCode(),ex.getMessage(),request);
    }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> id(Exception ex,HttpServletRequest request) { return reply(400,"INVALID_ORDER_ID","Mã đơn không hợp lệ",request); }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<?> json(Exception ex,HttpServletRequest request) { return reply(400,"INVALID_MOCK_ACTION","JSON không hợp lệ",request); }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<?> forbidden(Exception ex,HttpServletRequest request) { return reply(403,"FORBIDDEN","Không có quyền mô phỏng",request); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unexpected(Exception ex,HttpServletRequest request) { return reply(500,"INTERNAL_ERROR","Không thể xử lý yêu cầu",request); }
    private ResponseEntity<?> reply(int status,String code,String message,HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of("timestamp",OffsetDateTime.now().toString(),"status",status,
                "code",code,"message",message,"path",request.getRequestURI(),"errors",Map.of()));
    }
}
