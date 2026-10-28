package com.sports.mockpayos;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.*;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
@Transactional(propagation=Propagation.REQUIRES_NEW)
public class MockPayOSStore {
    private final MockPayOSStateRepository states;
    private final MockPayOSActionRepository actions;
    private final OrderRepository orders;
    private final PaymentAttemptRepository attempts;
    private final MockPayOSProof proof;
    @Value("${payos.mock-frontend-origin:http://localhost:5173}") private String frontendOrigin;
    public record Observation(PayOSPaymentClient.Query query,String fault) {}

    public MockPayOSState begin(PaymentAttemptResponse attempt) {
        var order=orders.findByIdForUpdate(attempt.orderId()).orElseThrow(MockPayOSStore::missing);
        var state=states.lockCode(attempt.orderCode()).orElseGet(()->newState(order));
        bind(state,attempt);
        if ("NOT_REQUESTED".equals(state.getCreateEffectStatus())) {
            state.setCreateEffectStatus("IN_FLIGHT");
            state.setOriginalCreateResult(proof.encode(proof.object().put("intent",attempt.id().toString())
                    .put("key",attempts.findById(attempt.id()).orElseThrow(MockPayOSStore::missing).getIdempotencyKey())
                    .put("orderCode",attempt.orderCode()).put("epoch",1)));
        }
        return states.saveAndFlush(state);
    }

    private MockPayOSState newState(com.sports.entity.Order order) {
        if (!"PAYOS_VIETQR".equals(order.getPaymentMethod()) || order.getStatus()!=OrderStatus.PENDING
                || order.getExpiresAt()==null || !order.getExpiresAt().isAfter(LocalDateTime.now())) throw ineligible();
        var state=new MockPayOSState();
        state.setOrderId(order.getId()); state.setOrderCode(order.getPayosOrderCode());
        state.setAmount(VndAmount.requireValid(order.getTotalAmount())); state.setAmountRemaining(state.getAmount());
        state.setExpiresAt(order.getExpiresAt());
        return state;
    }

    private void bind(MockPayOSState state,PaymentAttemptResponse attempt) {
        if (!state.getOrderId().equals(attempt.orderId()) || state.getAmount().compareTo(attempt.amount())!=0
                || !state.getExpiresAt().equals(attempt.expiresAt()) || !"VND".equals(attempt.currency())
                || state.getPaymentAttemptId()!=null && !state.getPaymentAttemptId().equals(attempt.id())) throw MockPayOSProof.invalid();
        state.setPaymentAttemptId(attempt.id());
    }

    public String createEffect(Long code) {
        var state=locked(code);
        String fault=consumeFault(state,"CREATE");
        if ("CREATE_TIMEOUT_BEFORE".equals(fault)) {
            state.setCreateEffectStatus("CLOSED_WITHOUT_EFFECT");
        } else if ("IN_FLIGHT".equals(state.getCreateEffectStatus())) { finishCreate(state); }
        else if (!"CREATED".equals(state.getCreateEffectStatus())) { throw conflict("PAYMENT_LINK_UNRESOLVED"); }
        states.saveAndFlush(state);
        return fault;
    }

    private void finishCreate(MockPayOSState state) {
        state.setPaymentLinkId("MOCK_LINK_"+UUID.randomUUID());
        state.setProviderStatus("PENDING"); state.setCreateEffectStatus("CREATED");
        ObjectNode original=(ObjectNode)proof.decode(state.getOriginalCreateResult());
        original.set("result",new ObjectMapper().valueToTree(result(state)));
        state.setOriginalCreateResult(proof.encode(original));
    }

    private String localUrl(Long id) {
        try {
            var uri=java.net.URI.create(frontendOrigin);
            if (!Set.of("localhost","127.0.0.1").contains(uri.getHost()) || !"http".equals(uri.getScheme())
                    || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
                    || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) throw MockPayOSProof.invalid();
            return frontendOrigin.replaceAll("/$","")+"/payment/qr/"+id;
        } catch (IllegalArgumentException ex) { throw MockPayOSProof.invalid(); }
    }

    private PayOSPaymentClient.Result result(MockPayOSState state) {
        return new PayOSPaymentClient.Result(state.getOrderCode(),state.getAmount(),state.getPaymentLinkId(),
                localUrl(state.getOrderId()),null);
    }

    @Transactional(readOnly=true,propagation=Propagation.REQUIRES_NEW)
    public PayOSPaymentClient.Result original(Long code) {
        var state=states.findByOrderCode(code).orElse(null);
        if (state==null || !"CREATED".equals(state.getCreateEffectStatus())) return null;
        JsonNode original=proof.decode(state.getOriginalCreateResult()).get("result");
        var result=proof.authenticated(original,PayOSPaymentClient.Result.class);
        if (!state.getOrderCode().equals(result.orderCode()) || state.getAmount().compareTo(result.amount())!=0
                || !state.getPaymentLinkId().equals(result.paymentLinkId()) || !localUrl(state.getOrderId()).equals(result.checkoutUrl())
                || result.qrPayload()!=null) throw MockPayOSProof.invalid();
        return result;
    }

    public String apply(String actionId,long epoch) {
        var action=actions.lockAction(actionId).orElseThrow(MockPayOSStore::missing);
        requireRunner(action,epoch);
        if (action.getEffectFacts()!=null) return action.getEffectFacts();
        var order=orders.findById(action.getOrderId()).orElseThrow(MockPayOSStore::missing);
        var state=states.lockCode(order.getPayosOrderCode()).orElseGet(()->newState(order));
        String facts=applyScenario(state,MockPayOSScenario.valueOf(action.getScenario()),order);
        states.saveAndFlush(state);
        action.setProviderStateId(state.getId()); action.setEffectFacts(facts);
        actions.saveAndFlush(action);
        return facts;
    }

    private String applyScenario(MockPayOSState state,MockPayOSScenario scenario,com.sports.entity.Order order) {
        if (scenario.name().startsWith("ARM_")) return arm(state,scenario);
        return switch (scenario) {
            case CLEAR_FAULTS -> { state.setFaultState(null); yield "{}"; }
            case COMPLETE_CREATE -> completeCreate(state);
            case RECOVER_CREATE -> { requireCreated(state); yield "{}"; }
            case COMPLETE_CANCEL_ZERO -> completeCancel(state);
            case PAYMENT_FAILED,PAYMENT_CANCELLED,PAYMENT_EXPIRED -> terminal(state,scenario);
            case REPLAY_WEBHOOK,CONFLICTING_WEBHOOK -> replay(state,scenario);
            case NON_SUCCESS_WEBHOOK -> { requireCreated(state); yield event(state,state.getAmount(),false,null); }
            default -> paid(state,scenario,order);
        };
    }

    private String arm(MockPayOSState state,MockPayOSScenario scenario) {
        String fault=scenario.name().substring(4),operation=fault.substring(0,fault.indexOf('_'));
        if ("CREATE".equals(operation) && !"NOT_REQUESTED".equals(state.getCreateEffectStatus())) throw conflict("MOCK_SCENARIO_NOT_APPLICABLE");
        ObjectNode faults=state.getFaultState()==null?proof.object():(ObjectNode)proof.decode(state.getFaultState());
        if (faults.has(operation)) throw conflict("MOCK_ACTION_CONFLICT");
        faults.put(operation,fault); state.setFaultState(proof.encode(faults));
        return "{}";
    }

    private String completeCreate(MockPayOSState state) {
        if (!"CLOSED_WITHOUT_EFFECT".equals(state.getCreateEffectStatus()) || state.getPaymentAttemptId()==null) {
            throw conflict("PAYMENT_LINK_UNRESOLVED");
        }
        JsonNode original=proof.authenticated(proof.decode(state.getOriginalCreateResult()),JsonNode.class);
        var attempt=attempts.findById(state.getPaymentAttemptId()).orElseThrow(MockPayOSStore::missing);
        if (!attempt.getIdempotencyKey().equals(original.path("key").asText())
                || attempt.getStatus()!=PaymentAttempt.Status.CREATING) throw conflict("PAYMENT_LINK_UNRESOLVED");
        finishCreate(state);
        return "{}";
    }

    private String completeCancel(MockPayOSState state) {
        requireCreated(state); requireZero(state);
        if (!state.isCancelRequested() || !"PROCESSING".equals(state.getProviderStatus())) throw conflict("MOCK_SCENARIO_NOT_APPLICABLE");
        state.setProviderStatus("CANCELLED"); return "{}";
    }

    private String terminal(MockPayOSState state,MockPayOSScenario scenario) {
        requireCreated(state); requireZero(state);
        if (!"PENDING".equals(state.getProviderStatus())) throw conflict("MOCK_SCENARIO_NOT_APPLICABLE");
        state.setProviderStatus(scenario.name().substring("PAYMENT_".length())); return "{}";
    }

    private String paid(MockPayOSState state,MockPayOSScenario scenario,com.sports.entity.Order order) {
        requireCreated(state); requireZero(state);
        boolean late=scenario.name().startsWith("LATE_");
        if (late && !"COD".equals(order.getPaymentMethod()) && order.getStatus()!=OrderStatus.CANCELLED
                && order.getExpiresAt().isAfter(LocalDateTime.now())) throw conflict("MOCK_SCENARIO_NOT_APPLICABLE");
        if (!late && (!"PENDING".equals(state.getProviderStatus()) || order.getStatus()!=OrderStatus.PENDING
                || !"PAYOS_VIETQR".equals(order.getPaymentMethod()))) throw conflict("ORDER_NOT_ELIGIBLE");
        BigDecimal amount=state.getAmount();
        if (scenario==MockPayOSScenario.PARTIAL_PAYMENT) {
            if (amount.compareTo(BigDecimal.ONE)<=0) throw conflict("MOCK_SCENARIO_NOT_APPLICABLE");
            amount=amount.divideToIntegralValue(BigDecimal.valueOf(2));
        }
        String facts=event(state,amount,true,null);
        JsonNode data=proof.decode(facts).get("data");
        state.setTransactionsJson(proof.encode(List.of(new PayOSPaymentClient.Transaction(data.path("reference").asText(),
                amount,data.path("transactionDateTime").asText()))));
        state.setAmountPaid(amount); state.setAmountRemaining(state.getAmount().subtract(amount));
        state.setProviderStatus("PAID"); return facts;
    }

    private String replay(MockPayOSState state,MockPayOSScenario scenario) {
        requireCreated(state);
        JsonNode transactions=proof.decode(state.getTransactionsJson());
        if (transactions.isEmpty()) return replayNonSettling(state,scenario);
        JsonNode original=transactions.get(0);
        BigDecimal amount=original.path("amount").decimalValue();
        if (scenario==MockPayOSScenario.CONFLICTING_WEBHOOK) amount=amount.add(BigDecimal.ONE);
        return event(state,amount,true,original);
    }

    private String replayNonSettling(MockPayOSState state,MockPayOSScenario scenario) {
        JsonNode original=actions.findByProviderStateIdOrderByCreatedAtAsc(state.getId()).stream()
                .filter(a->a.getEffectFacts()!=null).map(a->proof.decode(a.getEffectFacts()))
                .filter(f->f.has("data")).findFirst().orElseThrow(()->conflict("MOCK_SCENARIO_NOT_APPLICABLE"));
        ObjectNode normalized=(ObjectNode)original.deepCopy();
        if (scenario==MockPayOSScenario.CONFLICTING_WEBHOOK) {
            ObjectNode data=(ObjectNode)normalized.get("data");
            data.put("amount",data.get("amount").bigIntegerValue().add(java.math.BigInteger.ONE));
        }
        return proof.encode(normalized);
    }

    private String event(MockPayOSState state,BigDecimal amount,boolean success,JsonNode original) {
        String reference=original==null?"MOCK_REF_"+UUID.randomUUID():original.path("reference").asText();
        String time=original==null?LocalDateTime.now().withNano(0).toString():original.path("transactionDateTime").asText();
        ObjectNode data=proof.object().put("orderCode",state.getOrderCode()).put("paymentLinkId",state.getPaymentLinkId())
                .put("amount",amount.toBigIntegerExact()).put("currency","VND").put("reference",reference)
                .put("transactionDateTime",time).put("description","Mô phỏng").put("accountNumber","TEST-ONLY")
                .put("code",success?"00":"01").put("desc","Mô phỏng");
        ObjectNode envelope=proof.object().put("code",success?"00":"01").put("desc","Mô phỏng").put("success",success);
        envelope.set("data",data); return proof.encode(envelope);
    }

    private void requireCreated(MockPayOSState state) {
        if (!"CREATED".equals(state.getCreateEffectStatus()) || state.getPaymentLinkId()==null) throw conflict("PAYMENT_LINK_UNRESOLVED");
    }
    private void requireZero(MockPayOSState state) {
        if (state.getAmountPaid().signum()!=0) throw conflict("PAYMENT_ALREADY_SETTLED");
    }
    private void requireRunner(MockPayOSAction action,long epoch) {
        if (!"VERIFYING".equals(action.getStatus()) || action.getRunnerEpoch()!=epoch || action.getLeaseUntil()==null
                || !action.getLeaseUntil().isAfter(LocalDateTime.now())) throw conflict("MOCK_ACTION_CONFLICT");
    }

    public Observation observe(Long code,boolean cancel) {
        var found=states.lockCode(code);
        if (found.isEmpty()) return new Observation(null,"");
        var state=found.get();
        String fault=consumeFault(state,cancel?"CANCEL":"QUERY");
        if (!Set.of("CREATED").contains(state.getCreateEffectStatus())) return new Observation(null,fault);
        if (cancel && !"CANCEL_TIMEOUT_BEFORE".equals(fault)) cancel(state,fault);
        if (!cancel && "PENDING".equals(state.getProviderStatus()) && state.getAmountPaid().signum()==0
                && !state.getExpiresAt().isAfter(LocalDateTime.now())) state.setProviderStatus("EXPIRED");
        var query=query(state,"QUERY_UNKNOWN".equals(fault)?"UNKNOWN":state.getProviderStatus());
        states.saveAndFlush(state);
        return new Observation(proof.authenticated(query,PayOSPaymentClient.Query.class),fault);
    }

    private void cancel(MockPayOSState state,String fault) {
        state.setCancelRequested(true);
        if (state.getAmountPaid().signum()>0) return;
        if ("CANCEL_PROCESSING".equals(fault) || "PROCESSING".equals(state.getProviderStatus())) {
            state.setProviderStatus("PROCESSING"); return;
        }
        state.setProviderStatus("CANCELLED");
    }

    private PayOSPaymentClient.Query query(MockPayOSState state,String status) {
        var rows=proof.decode(state.getTransactionsJson());
        List<PayOSPaymentClient.Transaction> transactions=new ArrayList<>();
        rows.forEach(t->transactions.add(new PayOSPaymentClient.Transaction(t.path("reference").asText(),
                t.path("amount").decimalValue(),t.path("transactionDateTime").asText())));
        return new PayOSPaymentClient.Query(state.getOrderCode(),state.getAmount(),state.getPaymentLinkId(),status,
                state.getAmountPaid(),state.getAmountRemaining(),List.copyOf(transactions));
    }

    private String consumeFault(MockPayOSState state,String operation) {
        ObjectNode faults=state.getFaultState()==null?proof.object():(ObjectNode)proof.decode(state.getFaultState());
        String value=faults.path(operation).asText(""); faults.remove(operation);
        state.setFaultState(proof.encode(faults));
        return value;
    }

    private MockPayOSState locked(Long code) { return states.lockCode(code).orElseThrow(MockPayOSStore::missing); }

    @Transactional(readOnly=true,propagation=Propagation.REQUIRES_NEW)
    public String status(Long order) { return states.findByOrderId(order).map(MockPayOSState::getProviderStatus).orElse(null); }

    public static PaymentLinkException conflict(String code) {
        return new PaymentLinkException(409,code,"Kịch bản mô phỏng chưa đủ điều kiện; kiểm tra lại đơn");
    }
    public static PaymentLinkException missing() { return new PaymentLinkException(404,"ORDER_NOT_FOUND","Không tìm thấy đơn mô phỏng"); }
    private static PaymentLinkException ineligible() { return conflict("ORDER_NOT_ELIGIBLE"); }
}
