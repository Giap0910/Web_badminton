package com.sports.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.dto.PaymentReconcileRequest;
import com.sports.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @RequiredArgsConstructor
public class PaymentReconciliationService {
    private final PaymentReconciliationStore store;
    private final PayOSPaymentClient client;

    @Transactional(propagation = Propagation.NEVER)
    public PaymentSettlementService.Outcome reconcile(Long id, Long actor, String key, JsonNode body) {
        String validKey = validatedKey(key);
        var request = request(body);
        if (id == null || id <= 0 || actor == null || actor <= 0) throw invalidRequest();
        var prepared = store.prepare(id, actor, validKey, request.reason().trim());
        if (prepared.completed()) return new PaymentSettlementService.Outcome(200, prepared.attempt());
        var query = client.queryPayment(prepared.attempt().orderCode());
        return apply(id, validKey, query);
    }

    private PaymentSettlementService.Outcome apply(Long id, String key, PayOSPaymentClient.Query query) {
        for (int retry = 0; ; retry++) {
            try { return store.complete(id, key, query); }
            catch (DataIntegrityViolationException | TransientDataAccessException ex) {
                if (retry >= 2) throw ex;
            }
        }
    }

    private PaymentReconcileRequest request(JsonNode body) {
        if (body == null || !body.isObject() || body.size() != 1 || !body.path("reason").isTextual()
                || body.get("reason").textValue().isBlank()) throw invalidRequest();
        return new PaymentReconcileRequest(body.get("reason").textValue());
    }

    private String validatedKey(String key) {
        try { return OrderRequestFingerprint.validateKey(key); }
        catch (BadRequestException ex) {
            throw new PaymentLinkException(400, "INVALID_IDEMPOTENCY_KEY", ex.getMessage());
        }
    }

    private PaymentLinkException invalidRequest() {
        return new PaymentLinkException(400, "INVALID_RECONCILIATION", "Cần mã giao dịch và lý do đối soát hợp lệ");
    }
}
