package com.sports.repository;

import com.sports.entity.Order;
import com.sports.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.idempotencyKey = :key")
    Optional<Order> findByUserIdAndIdempotencyKey(@Param("userId") Long userId, @Param("key") String key);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByStatusAndExpiresAtBefore(OrderStatus status, LocalDateTime time);

    int countByUserIdAndStatus(Long userId, OrderStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.payosOrderCode = :code")
    Optional<Order> findByPayosOrderCodeForUpdate(@Param("code") Long code);

    Optional<Order> findByPayosOrderCode(Long payosOrderCode);

    @Query("SELECT o.id FROM Order o WHERE o.status = com.sports.entity.OrderStatus.PENDING "
            + "AND o.paymentMethod = 'PAYOS_VIETQR' AND o.expiresAt < :now")
    List<Long> findExpiredPaymentOrderIds(@Param("now") LocalDateTime now);

    List<Order> findAllByOrderByCreatedAtDesc();

    long countByStatus(OrderStatus status);

    boolean existsByVoucherCodeIgnoreCase(String voucherCode);

    List<Order> findTop5ByOrderByCreatedAtDesc();

    List<Order> findByStatus(OrderStatus status);

    @Query("SELECT o FROM Order o WHERE ((o.paymentMethod = 'PAYOS_VIETQR' AND o.status IN "
            + "(com.sports.entity.OrderStatus.PAID, com.sports.entity.OrderStatus.SHIPPING, com.sports.entity.OrderStatus.COMPLETED) "
            + "AND EXISTS (SELECT p.id FROM PaymentAttempt p WHERE p.order = o AND p.provider='PAYOS' "
            + "AND p.status = com.sports.entity.PaymentAttempt$Status.PAID AND p.paidAt IS NOT NULL AND p.amount = o.totalAmount)) "
            + "OR (o.paymentMethod = 'COD' AND o.cashCollectedAt IS NOT NULL AND NOT EXISTS "
            + "(SELECT p.id FROM PaymentAttempt p WHERE p.order=o AND p.status IN "
            + "(com.sports.entity.PaymentAttempt$Status.PAID,com.sports.entity.PaymentAttempt$Status.NEEDS_REVIEW)) "
            + "AND NOT EXISTS (SELECT e.id FROM PaymentEvent e WHERE e.paymentAttempt.order=o AND e.amount>0 "
            + "AND (e.receivedPayment=true OR e.processingResult='PAID')))) "
            + "AND NOT EXISTS (SELECT c.id FROM PaymentEventConflict c WHERE c.paymentEvent.paymentAttempt.order=o) "
            + "AND NOT EXISTS (SELECT e.id FROM PaymentEvent e WHERE e.paymentAttempt.order=o AND e.reviewReason IN "
            + "('IDENTITY_MISMATCH','CURRENCY_MISMATCH','EVENT_IDENTITY_CONFLICT'))")
    List<Order> findRecognizedPaymentOrders();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
}
