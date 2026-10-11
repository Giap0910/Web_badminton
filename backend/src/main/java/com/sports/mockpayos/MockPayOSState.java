package com.sports.mockpayos;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="mock_payos_state") @Getter @Setter @NoArgsConstructor
public class MockPayOSState {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true) private Long orderId;
    @Column(unique=true) private Long paymentAttemptId;
    @Column(nullable=false, unique=true) private Long orderCode;
    @Column(unique=true) private String paymentLinkId;
    @Column(nullable=false, precision=12, scale=0) private BigDecimal amount;
    @Column(nullable=false, length=8) private String currency="VND";
    @Column(nullable=false) private LocalDateTime expiresAt;
    @Column(nullable=false, length=32) private String providerStatus="NOT_CREATED";
    @Column(nullable=false, length=32) private String createEffectStatus="NOT_REQUESTED";
    @Column(nullable=false, precision=20, scale=0) private BigDecimal amountPaid=BigDecimal.ZERO;
    @Column(nullable=false, precision=20, scale=0) private BigDecimal amountRemaining;
    @Column(nullable=false, columnDefinition="LONGTEXT") private String transactionsJson="[]";
    @Column(columnDefinition="LONGTEXT") private String originalCreateResult;
    @Column(columnDefinition="LONGTEXT") private String faultState;
    @Column(nullable=false) private boolean cancelRequested;
    @Version @Column(nullable=false) private long version;
    @Column(nullable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private LocalDateTime updatedAt;
    @PrePersist void created() { createdAt=LocalDateTime.now(); updatedAt=createdAt; }
    @PreUpdate void updated() { updatedAt=LocalDateTime.now(); }
}
