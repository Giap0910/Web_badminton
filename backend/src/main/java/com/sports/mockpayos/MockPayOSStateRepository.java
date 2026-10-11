package com.sports.mockpayos;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;

public interface MockPayOSStateRepository extends JpaRepository<MockPayOSState,Long> {
    Optional<MockPayOSState> findByOrderId(Long id);
    Optional<MockPayOSState> findByOrderCode(Long code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from MockPayOSState s where s.orderCode=:code")
    Optional<MockPayOSState> lockCode(Long code);
}
