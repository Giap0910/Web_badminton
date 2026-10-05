package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_reconciliations", uniqueConstraints = @UniqueConstraint(
        name = "uk_payment_reconciliation_key", columnNames = {"payment_attempt_id", "idempotency_key"}))
@Getter @Setter @NoArgsConstructor
public class PaymentReconciliation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_attempt_id", nullable = false, updatable = false)
    private PaymentAttempt paymentAttempt;
    @Column(name = "idempotency_key", nullable = false, updatable = false, length = 36)
    private String idempotencyKey;
    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String reason;
    @Column(nullable = false, updatable = false)
    private Long actorId;
    private boolean completed;
    private Integer httpStatus;
    @Column(columnDefinition = "LONGTEXT")
    private String evidenceHistory;
    @Column(length = 64)
    private String lastEvidenceHash;
    private LocalDateTime completedAt;
    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
