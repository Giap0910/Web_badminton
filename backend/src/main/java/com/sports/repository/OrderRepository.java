package com.sports.repository;

import com.sports.entity.Order;
import com.sports.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByStatusAndExpiresAtBefore(OrderStatus status, LocalDateTime time);

    int countByUserIdAndStatus(Long userId, OrderStatus status);

    Optional<Order> findByPayosOrderCode(Long payosOrderCode);

    List<Order> findAllByOrderByCreatedAtDesc();
}
