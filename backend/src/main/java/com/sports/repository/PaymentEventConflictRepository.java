package com.sports.repository;

import com.sports.entity.PaymentEventConflict;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentEventConflictRepository extends JpaRepository<PaymentEventConflict, Long> {
    boolean existsByPaymentEventIdAndFingerprint(Long eventId, String fingerprint);
    boolean existsByPaymentEventPaymentAttemptId(Long attemptId);
}
