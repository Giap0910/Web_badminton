package com.sports.exception;

import lombok.Getter;

@Getter
public class PaymentLinkException extends RuntimeException {
    private final int status;
    private final String code;

    public PaymentLinkException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
