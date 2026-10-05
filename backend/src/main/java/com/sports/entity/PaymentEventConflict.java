package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_event_conflicts", uniqueConstraints = @UniqueConstraint(
        name = "uk_payment_conflict_facts", columnNames = {"payment_event_id", "fingerprint"}))
@Getter @Setter @NoArgsConstructor
public class PaymentEventConflict {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_event_id", nullable = false, updatable = false)
    private PaymentEvent paymentEvent;
    @Column(nullable = false, updatable = false, length = 64)
    private String fingerprint;
    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String incomingFacts;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false, length = 32)
    private PaymentEvent.Source source;
    @Column(nullable = false, updatable = false, length = 64)
    private String reviewReason = "EVENT_IDENTITY_CONFLICT";
    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime receivedAt;
}
