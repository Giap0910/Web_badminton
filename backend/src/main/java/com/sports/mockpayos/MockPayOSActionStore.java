package com.sports.mockpayos;

import com.sports.dto.*;
import com.sports.repository.*;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.util.*;

@Service @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
@Transactional(propagation=Propagation.REQUIRES_NEW)
public class MockPayOSActionStore {
    private final MockPayOSActionRepository actions;
    private final OrderRepository orders;
    private final OrderService orderService;
    private final PaymentAttemptStore payments;
    private final MockPayOSStore provider;
    public record Runner(String actionId,long epoch,boolean claimed,boolean replay) {}
    public record ActionView(String actionId,String scenario,String status,String reason,String idempotencyKey,long retryAfterSeconds) {}
    public record Response(String paymentMode,Long orderId,long stateVersion,ActionView action,String providerStatus,
            OrderResponse order,PaymentAttemptResponse payment,boolean replay) {}

    public Runner prepare(Long id,Long actor,String key,MockPayOSScenario scenario) {
        var order=orders.findByIdForUpdate(id).orElseThrow(MockPayOSStore::missing);
        String hash=PaymentLedgerService.hash(id+":"+scenario.name());
        var existing=actions.findByActorIdAndOrderIdAndIdempotencyKey(actor,id,key);
        if (existing.isPresent()) {
            if (!hash.equals(existing.get().getRequestHash())) throw MockPayOSStore.conflict("IDEMPOTENCY_CONFLICT");
            return claim(existing.get(),true);
        }
        if (!actions.findByOrderIdAndStatus(id,"VERIFYING").isEmpty()) throw MockPayOSStore.conflict("MOCK_ACTION_CONFLICT");
        if (order.getPayosOrderCode()==null) throw MockPayOSStore.conflict("ORDER_NOT_ELIGIBLE");
        var action=new MockPayOSAction(); action.setActionId(UUID.randomUUID().toString());
        action.setOrderId(id); action.setActorId(actor); action.setIdempotencyKey(key); action.setRequestHash(hash);
        action.setScenario(scenario.name()); actions.saveAndFlush(action);
        return claim(action,false);
    }

    private Runner claim(MockPayOSAction action,boolean replay) {
        if (!"VERIFYING".equals(action.getStatus()) || action.getLeaseUntil()!=null
                && action.getLeaseUntil().isAfter(LocalDateTime.now())) {
            return new Runner(action.getActionId(),action.getRunnerEpoch(),false,replay);
        }
        if (action.getRunnerEpoch()>=9007199254740991L) throw MockPayOSStore.conflict("MOCK_ACTION_CONFLICT");
        action.setRunnerEpoch(action.getRunnerEpoch()+1); action.setLeaseUntil(LocalDateTime.now().plusSeconds(60));
        action.setReason(null); appendAudit(action,"CLAIM"); actions.saveAndFlush(action);
        return new Runner(action.getActionId(),action.getRunnerEpoch(),true,replay);
    }

    public void complete(Runner runner) {
        var action=locked(runner);
        action.setStatus("APPLIED"); action.setReason(null); action.setCompletedAt(LocalDateTime.now());
        action.setLeaseUntil(null); appendAudit(action,"APPLIED"); actions.saveAndFlush(action);
    }

    public void failed(Runner runner,int status,String reason) {
        var found=actions.lockAction(runner.actionId());
        if (found.isEmpty() || found.get().getRunnerEpoch()!=runner.epoch() || !"VERIFYING".equals(found.get().getStatus())) return;
        var action=found.get(); action.setReason(reason); action.setLeaseUntil(null);
        if (status==409) { action.setStatus("REJECTED"); action.setCompletedAt(LocalDateTime.now()); }
        action.setResult(Integer.toString(status)); appendAudit(action,reason); actions.saveAndFlush(action);
    }

    private MockPayOSAction locked(Runner runner) {
        var action=actions.lockAction(runner.actionId()).orElseThrow(MockPayOSStore::missing);
        if (!"VERIFYING".equals(action.getStatus()) || action.getRunnerEpoch()!=runner.epoch()
                || action.getLeaseUntil()==null || !action.getLeaseUntil().isAfter(LocalDateTime.now())) {
            throw MockPayOSStore.conflict("MOCK_ACTION_CONFLICT");
        }
        return action;
    }

    private void appendAudit(MockPayOSAction action,String event) {
        action.setAuditHistory(action.getAuditHistory().replaceFirst("\\]$",(action.getAuditHistory().length()>2?",":"")
                +"{\"event\":\""+event+"\",\"epoch\":"+action.getRunnerEpoch()+",\"time\":\""+LocalDateTime.now()+"\"}]"));
    }

    @Transactional(readOnly=true,propagation=Propagation.REQUIRES_NEW)
    public Response reply(Runner runner) {
        var action=actions.findByActionId(runner.actionId()).orElseThrow(MockPayOSStore::missing);
        if ("REJECTED".equals(action.getStatus())) throw MockPayOSStore.conflict(action.getReason());
        var order=orders.findById(action.getOrderId()).orElseThrow(MockPayOSStore::missing);
        long retry=action.getLeaseUntil()==null?0:Math.max(1,Duration.between(LocalDateTime.now(),action.getLeaseUntil()).getSeconds());
        var view=new ActionView(action.getActionId(),action.getScenario(),action.getStatus(),action.getReason(),action.getIdempotencyKey(),retry);
        return new Response("MOCK",order.getId(),order.getCheckoutRevision(),view,provider.status(order.getId()),
                orderService.getOrderById(order.getId(),action.getActorId(),true),payments.read(order.getId(),action.getActorId(),true),runner.replay());
    }
}
