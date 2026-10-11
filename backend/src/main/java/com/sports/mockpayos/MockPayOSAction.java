package com.sports.mockpayos;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Getter @Setter @NoArgsConstructor
@Table(name="mock_payos_actions", uniqueConstraints=@UniqueConstraint(columnNames={"actorId","orderId","idempotencyKey"}))
public class MockPayOSAction {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=36, columnDefinition="CHAR(36)") private String actionId;
    @Column(nullable=false) private Long orderId;
    @Column(nullable=false) private Long actorId;
    @Column(nullable=false, length=36, columnDefinition="CHAR(36)") private String idempotencyKey;
    @Column(nullable=false, length=64, columnDefinition="CHAR(64)") private String requestHash;
    @Column(nullable=false, length=64) private String scenario;
    @Column(nullable=false, length=16) private String status="VERIFYING";
    @Column(length=64) private String reason;
    private Long providerStateId;
    private LocalDateTime leaseUntil;
    @Column(nullable=false) private long runnerEpoch;
    @Column(columnDefinition="LONGTEXT") private String effectFacts;
    @Column(columnDefinition="LONGTEXT") private String result;
    @Column(nullable=false, columnDefinition="LONGTEXT") private String auditHistory="[]";
    @Column(nullable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
    @PrePersist void created() { createdAt=LocalDateTime.now(); updatedAt=createdAt; }
    @PreUpdate void updated() { updatedAt=LocalDateTime.now(); }
}
