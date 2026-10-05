package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_events", uniqueConstraints = @UniqueConstraint(name = "uk_payment_event_identity",
        columnNames = {"provider", "payment_link_id", "reference"}))
@Getter @Setter @NoArgsConstructor
public class PaymentEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, updatable = false, columnDefinition = "varbinary(32)")
    private String provider;
    @ManyToOne(fetch = FetchType.LAZY)
    private PaymentAttempt paymentAttempt;
    @ManyToOne(fetch = FetchType.LAZY)
    private Order order;
    @Column(name = "payment_link_id", nullable = false, updatable = false, columnDefinition = "varbinary(1020)")
    private String paymentLinkId;
    @Column(nullable = false, updatable = false, columnDefinition = "varbinary(1020)")
    private String reference;
    @Column(nullable = false, updatable = false)
    private Long orderCode;
    @Column(nullable = false, updatable = false, precision = 20, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false, updatable = false, length = 255)
    private String currency;
    @Column(nullable = false, updatable = false, length = 255)
    private String transactionDateTime;
    @Column(nullable = false, updatable = false)
    private LocalDateTime receivedAt;
    @Column(nullable = false, updatable = false)
    private LocalDateTime verifiedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false, length = 32)
    private Source source;
    @Column(nullable = false, length = 64)
    private String processingResult;
    @Column(length = 64)
    private String reviewReason;
    @Column(columnDefinition = "TEXT")
    private String reviewHistory;
    @Column(nullable = false, updatable = false, length = 64)
    private String fingerprint;
    @Column(nullable = false, updatable = false)
    private boolean receivedPayment;
    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Source { WEBHOOK, RECONCILE_QUERY }
}
