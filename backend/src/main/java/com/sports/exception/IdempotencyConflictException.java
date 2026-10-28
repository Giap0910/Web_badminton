package com.sports.exception;

public class IdempotencyConflictException extends RuntimeException {
    public IdempotencyConflictException() {
        super("Idempotency-Key đã được sử dụng với dữ liệu khác hoặc yêu cầu tạo đơn bị xung đột");
    }
}
