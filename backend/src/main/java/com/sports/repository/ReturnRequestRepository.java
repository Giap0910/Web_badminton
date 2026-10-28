package com.sports.repository;

import com.sports.entity.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ReturnRequest> findAllByOrderByCreatedAtDesc();
    List<ReturnRequest> findByOrderIdOrderByCreatedAtDesc(Long orderId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM ReturnRequest r WHERE r.order.id=:id ORDER BY r.createdAt DESC")
    List<ReturnRequest> findByOrderIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Query("SELECT r.order.id FROM ReturnRequest r WHERE r.id=:id")
    java.util.Optional<Long> findOrderIdByRequestId(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM ReturnRequest r WHERE r.id=:id")
    java.util.Optional<ReturnRequest> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
