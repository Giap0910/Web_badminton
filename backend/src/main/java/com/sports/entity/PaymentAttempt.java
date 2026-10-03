package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_attempts")
@Getter @Setter @NoArgsConstructor
public class PaymentAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;
    @Column(nullable = false)
    private String provider = "PAYOS";
    @Column(nullable = false, unique = true)
    private Long orderCode;
    @Column(unique = true)
    private String paymentLinkId;
    @Column(nullable = false, length = 36)
    private String idempotencyKey;
    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false)
    private String currency = "VND";
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Status status = Status.CREATING;
    @Column(length = 2048)
    private String checkoutUrl;
    @Column(columnDefinition = "TEXT")
    private String qrPayload;
    private LocalDateTime expiresAt;
    private String reference;
    private LocalDateTime paidAt;
    private String reviewReason;

    public enum Status { CREATING, PENDING, PAID, FAILED, EXPIRED, CANCELLED, NEEDS_REVIEW }
}
