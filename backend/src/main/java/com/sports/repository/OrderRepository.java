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

    List<Order> findTop5ByOrderByCreatedAtDesc();

    List<Order> findByStatus(OrderStatus status);

    @Query("SELECT o FROM Order o WHERE o.status IN (com.sports.entity.OrderStatus.PAID, "
            + "com.sports.entity.OrderStatus.COMPLETED) OR (o.status = com.sports.entity.OrderStatus.SHIPPING "
            + "AND o.paymentMethod = 'PAYOS_VIETQR')")
    List<Order> findRecognizedPaymentOrders();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
}
