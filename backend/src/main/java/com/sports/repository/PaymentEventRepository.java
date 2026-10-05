package com.sports.repository;

import com.sports.entity.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PaymentEvent> findByProviderAndPaymentLinkIdAndReference(String provider, String link, String reference);
    List<PaymentEvent> findByPaymentAttemptId(Long attemptId);
}
