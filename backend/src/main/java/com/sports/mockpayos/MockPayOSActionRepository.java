package com.sports.mockpayos;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface MockPayOSActionRepository extends JpaRepository<MockPayOSAction,Long> {
    Optional<MockPayOSAction> findByActorIdAndOrderIdAndIdempotencyKey(Long actor,Long order,String key);
    Optional<MockPayOSAction> findByActionId(String id);
    List<MockPayOSAction> findByProviderStateIdOrderByCreatedAtAsc(Long id);
    List<MockPayOSAction> findByOrderIdAndStatus(Long order,String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from MockPayOSAction a where a.actionId=:id")
    Optional<MockPayOSAction> lockAction(String id);
}
