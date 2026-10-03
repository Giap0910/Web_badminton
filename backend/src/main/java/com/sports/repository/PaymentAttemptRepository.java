package com.sports.repository;

import com.sports.entity.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
    Optional<PaymentAttempt> findByOrderId(Long orderId);
}
