package com.sports.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.dto.PaymentTransitionRequest;
import com.sports.entity.PaymentEvent;
import com.sports.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @RequiredArgsConstructor
public class PaymentTransitionService {
    private final PaymentTransitionStore store;
    private final PayOSGateway client;
    private final PaymentTransitionPolicy policy;

    @Transactional(propagation = Propagation.NEVER)
    public PaymentTransitionStore.Outcome submit(Long id, Long owner, String key, JsonNode body) {
        store.authorize(id, owner);
        String validKey = validateKey(key);
        var request = PaymentTransitionRequest.parse(body);
        String operation = store.prepare(id, owner, validKey, request);
        var runner = store.claim(id, owner, operation);
        if (!runner.claimed()) return result(store.reply(runner, true));
        try { return result(run(runner)); }
        catch (PaymentLinkException ex) { store.failed(runner, ex.getCode()); throw ex; }
    }

    private PaymentTransitionStore.Outcome run(PaymentTransitionStore.Runner runner) {
        if ("PAYOS_VIETQR".equals(runner.target())) {
            return store.activatePayos(runner, runner.code() == null ? null : query(runner.code()));
        }
        var query = query(runner.code());
        var observed = store.observe(runner, query, PaymentEvent.Source.RECONCILE_QUERY, true);
        if (observed.status() != 202 || !policy.zero(query)) return observed;
        if (!"PENDING".equals(query.status()) && !"FAILED".equals(query.status())) return observed;
        if (!store.renew(runner)) return store.reply(runner.orderId(), runner.userId(), true);
        var cancelled = client.cancelPayment(runner.code());
        policy.requireKnown(cancelled);
        observed = store.observe(runner, cancelled, PaymentEvent.Source.PROVIDER_CANCEL, false);
        if (observed.status() != 202 || !policy.zero(cancelled)) return observed;
        if (!store.renew(runner)) return store.reply(runner.orderId(), runner.userId(), true);
        return store.observe(runner, query(runner.code()), PaymentEvent.Source.RECONCILE_QUERY, true);
    }

    private PayOSPaymentClient.Query query(Long code) {
        var proof = client.queryPayment(code);
        if (proof == null) throw new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "Chưa xác minh được link đã tồn tại");
        policy.requireKnown(proof);
        return proof;
    }

    private PaymentTransitionStore.Outcome result(PaymentTransitionStore.Outcome result) {
        if (result.error() != null) throw new PaymentLinkException(result.status(), result.error(), "Thanh toán cần được kiểm tra lại");
        return result;
    }

    private String validateKey(String key) {
        try { return OrderRequestFingerprint.validateKey(key); }
        catch (BadRequestException ex) { throw new PaymentLinkException(400, "INVALID_IDEMPOTENCY_KEY", ex.getMessage()); }
    }
}

