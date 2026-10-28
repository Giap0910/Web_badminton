package com.sports.dto;

import com.sports.entity.PaymentAttempt;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAttemptResponse(Long id, Long orderId, String provider, Long orderCode,
        String paymentLinkId, BigDecimal amount, String currency, PaymentAttempt.Status status,
        String checkoutUrl, String qrPayload, LocalDateTime expiresAt, String reference,
        LocalDateTime paidAt, String reviewReason, String paymentMode, String mockProviderStatus, LocalDateTime createdAt) {
    public PaymentAttemptResponse(Long id, Long orderId, String provider, Long orderCode,
            String paymentLinkId, BigDecimal amount, String currency, PaymentAttempt.Status status,
            String checkoutUrl, String qrPayload, LocalDateTime expiresAt, String reference,
            LocalDateTime paidAt, String reviewReason, String paymentMode, String mockProviderStatus) {
        this(id,orderId,provider,orderCode,paymentLinkId,amount,currency,status,checkoutUrl,qrPayload,
                expiresAt,reference,paidAt,reviewReason,paymentMode,mockProviderStatus,null);
    }
    public PaymentAttemptResponse(Long id, Long orderId, String provider, Long orderCode,
            String paymentLinkId, BigDecimal amount, String currency, PaymentAttempt.Status status,
            String checkoutUrl, String qrPayload, LocalDateTime expiresAt, String reference,
            LocalDateTime paidAt, String reviewReason) {
        this(id,orderId,provider,orderCode,paymentLinkId,amount,currency,status,checkoutUrl,qrPayload,
                expiresAt,reference,paidAt,reviewReason,"REAL",null);
    }
    public static PaymentAttemptResponse from(PaymentAttempt attempt) {
        return new PaymentAttemptResponse(attempt.getId(), attempt.getOrder().getId(), attempt.getProvider(),
                attempt.getOrderCode(), attempt.getPaymentLinkId(), attempt.getAmount(), attempt.getCurrency(),
                attempt.getStatus(), attempt.getCheckoutUrl(), attempt.getQrPayload(), attempt.getExpiresAt(),
                attempt.getReference(), attempt.getPaidAt(), attempt.getReviewReason(), "REAL", null, attempt.getCreatedAt());
    }
}
