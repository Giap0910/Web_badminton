package com.sports.mockpayos;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.exception.*;
import com.sports.service.*;
import com.sports.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
public class MockPayOSActionService {
    private final MockPayOSActionStore actions;
    private final MockPayOSStore provider;
    private final MockPayOSProof proof;
    private final PaymentWebhookService webhooks;
    private final MockPayOSRecovery recovery;

    @Transactional(propagation=Propagation.NEVER)
    public MockPayOSActionStore.Response submit(Long id,Long actor,String key,JsonNode body) {
        if (id==null || id<=0 || id>9007199254740991L) throw new PaymentLinkException(400,"INVALID_ORDER_ID","Mã đơn không hợp lệ");
        var scenario=MockPayOSScenario.parse(body);
        var runner=actions.prepare(id,actor,validKey(key),scenario);
        if (!runner.claimed()) return actions.reply(runner);
        try {
            String facts=provider.apply(runner.actionId(),runner.epoch());
            consume(id,scenario,facts);
            actions.complete(runner);
            return actions.reply(runner);
        } catch (PaymentLinkException ex) { actions.failed(runner,ex.getStatus(),ex.getCode()); throw ex; }
        catch (RuntimeException ex) { actions.failed(runner,500,"INTERNAL_ERROR"); throw ex; }
    }

    private void consume(Long id,MockPayOSScenario scenario,String facts) {
        if (scenario==MockPayOSScenario.RECOVER_CREATE) { recovery.complete(id); return; }
        if (scenario==MockPayOSScenario.PAYMENT_PAID_QUERY || scenario==MockPayOSScenario.LATE_PAYMENT_QUERY) return;
        JsonNode normalized=proof.decode(facts);
        if (normalized.has("data")) webhooks.accept(proof.webhook(normalized));
    }

    private String validKey(String key) {
        try {
            String normalized=OrderRequestFingerprint.validateKey(key);
            if (java.util.UUID.fromString(normalized).version()!=4 || java.util.UUID.fromString(normalized).variant()!=2) {
                throw new BadRequestException("Idempotency-Key phải là UUID v4");
            }
            return normalized;
        }
        catch (BadRequestException ex) { throw new PaymentLinkException(400,"INVALID_IDEMPOTENCY_KEY",ex.getMessage()); }
    }
}
