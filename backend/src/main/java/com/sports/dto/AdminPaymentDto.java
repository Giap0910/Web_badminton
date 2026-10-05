package com.sports.dto;

import com.sports.entity.PaymentAttempt;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminPaymentDto {
    private Long id;
    private Long orderId;
    private String provider;
    private Long orderCode;
    private String paymentLinkId;
    private BigDecimal amount;
    private String currency;
    private PaymentAttempt.Status status;
    private String checkoutUrl;
    private String qrPayload;
    private LocalDateTime expiresAt;
    private String reference;
    private LocalDateTime paidAt;
    private String reviewReason;
    private String customerName;
    private String paymentMethod;

    public static AdminPaymentDto from(PaymentAttempt attempt) {
        var order = attempt.getOrder();
        return AdminPaymentDto.builder().id(attempt.getId()).orderId(order.getId()).provider(attempt.getProvider())
                .orderCode(attempt.getOrderCode()).paymentLinkId(attempt.getPaymentLinkId()).amount(attempt.getAmount())
                .currency(attempt.getCurrency()).status(attempt.getStatus()).checkoutUrl(attempt.getCheckoutUrl())
                .qrPayload(attempt.getQrPayload()).expiresAt(attempt.getExpiresAt()).reference(attempt.getReference())
                .paidAt(attempt.getPaidAt()).reviewReason(attempt.getReviewReason())
                .customerName(order.getCustomerName()).paymentMethod(order.getPaymentMethod()).build();
    }
}
