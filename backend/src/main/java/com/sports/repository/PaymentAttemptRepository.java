package com.sports.repository;

import com.sports.entity.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long>, JpaSpecificationExecutor<PaymentAttempt> {
    Optional<PaymentAttempt> findByOrderId(Long orderId);
    Optional<PaymentAttempt> findByPaymentLinkId(String linkId);
    Optional<PaymentAttempt> findByOrderCode(Long orderCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from PaymentAttempt a where a.id = :id")
    Optional<PaymentAttempt> findByIdForUpdate(@Param("id") Long id);
}
