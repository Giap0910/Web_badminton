package com.sports.repository;

import com.sports.entity.PaymentReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentReconciliationRepository extends JpaRepository<PaymentReconciliation, Long> {
    Optional<PaymentReconciliation> findByPaymentAttemptIdAndIdempotencyKey(Long attemptId, String key);
}
