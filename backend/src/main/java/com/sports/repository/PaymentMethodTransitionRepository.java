package com.sports.repository;

import com.sports.entity.PaymentMethodTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface PaymentMethodTransitionRepository extends JpaRepository<PaymentMethodTransition, Long> {
    Optional<PaymentMethodTransition> findFirstByOrderIdOrderByIdDesc(Long orderId);
    Optional<PaymentMethodTransition> findByOrderIdAndIdempotencyKey(Long orderId, String key);
    boolean existsByOrderIdAndTargetMethod(Long orderId, String method);
    Optional<PaymentMethodTransition> findByOperationId(String operationId);
    default Optional<PaymentMethodTransition> findByOrderId(Long orderId) {
        return findFirstByOrderIdOrderByIdDesc(orderId);
    }
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PaymentMethodTransition t where t.id = (select max(s.id) from PaymentMethodTransition s where s.order.id = :orderId)")
    Optional<PaymentMethodTransition> findByOrderIdForUpdate(@Param("orderId") Long orderId);
}
