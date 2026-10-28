package com.sports.exception;

import lombok.Getter;

@Getter
public class ProductImageException extends RuntimeException {
    private final int status;
    private final String code;

    public ProductImageException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
