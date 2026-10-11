package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "payment_method_transitions")
@Getter @Setter @NoArgsConstructor
public class PaymentMethodTransition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "operation_id", nullable = false, unique = true, length = 36, columnDefinition = "char(36)", updatable = false) private String operationId;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true, updatable = false) private Order order;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_attempt_id", nullable = false, updatable = false) private PaymentAttempt paymentAttempt;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false, updatable = false) private User actor;
    @Column(name = "idempotency_key", nullable = false, length = 36, columnDefinition = "char(36)", updatable = false) private String idempotencyKey;
    @Column(name = "request_hash", nullable = false, length = 64, columnDefinition = "char(64)", updatable = false) private String requestHash;
    @Column(name = "source_method", nullable = false, length = 32, updatable = false) private String sourceMethod = "PAYOS_VIETQR";
    @Column(name = "target_method", nullable = false, length = 32, updatable = false) private String targetMethod = "COD";
    @Column(name = "expected_state_version", nullable = false, updatable = false) private long expectedStateVersion;
    @Column(name = "original_expires_at", nullable = false, updatable = false) private LocalDateTime originalExpiresAt;
    @Column(name = "provider_order_code", nullable = false, updatable = false) private Long providerOrderCode;
    @Column(name = "provider_link_id", nullable = false, updatable = false, columnDefinition = "varbinary(1020)") private String providerLinkId;
    @Column(nullable = false, updatable = false, precision = 12, scale = 0) private BigDecimal amount;
    @Column(nullable = false, updatable = false, length = 8) private String currency;
    @Enumerated(EnumType.STRING) @Column(nullable = false, columnDefinition = "varchar(32)")
    private Status status = Status.VERIFYING;
    @Column(length = 64) private String reason;
    @Column(name = "runner_epoch", nullable = false) private long runnerEpoch;
    @Column(name = "lease_until") private LocalDateTime leaseUntil;
    @Column(name = "evidence_history", nullable = false, columnDefinition = "LONGTEXT") private String evidenceHistory = "";
    @Column(name = "last_evidence_hash", length = 64, columnDefinition = "char(64)") private String lastEvidenceHash;
    @Column(columnDefinition = "JSON") private String result;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Column(name = "applied_at") private LocalDateTime appliedAt;
    @Column(name = "finished_at") private LocalDateTime finishedAt;

    public enum Status { VERIFYING, APPLIED, REJECTED, NEEDS_REVIEW }
}
