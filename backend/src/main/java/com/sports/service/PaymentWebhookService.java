package com.sports.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.entity.PaymentEvent;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @RequiredArgsConstructor
public class PaymentWebhookService {
    private final PayOSService signatures;
    private final PaymentSettlementService settlement;

    @Transactional(propagation = Propagation.NEVER)
    public void accept(JsonNode payload) {
        var evidence = parse(payload);
        for (int retry = 0; ; retry++) {
            try { settlement.webhook(evidence); return; }
            catch (DataIntegrityViolationException | TransientDataAccessException ex) {
                if (retry >= 2) throw ex;
            }
        }
    }

    private PaymentEvidence parse(JsonNode payload) {
        validateStructure(payload);
        if (!signatures.verifyWebhookPayload(payload)) {
            throw new PaymentLinkException(401, "INVALID_SIGNATURE", "Chữ ký không hợp lệ");
        }
        var data = payload.get("data");
        boolean success = payload.get("success").booleanValue() && "00".equals(payload.get("code").textValue())
                && "00".equals(data.get("code").textValue());
        return new PaymentEvidence(data.get("paymentLinkId").textValue(), data.get("orderCode").longValue(),
                data.get("reference").textValue(), data.get("amount").decimalValue(), data.get("currency").textValue(),
                data.get("transactionDateTime").textValue(), success, PaymentEvent.Source.WEBHOOK);
    }

    private void validateStructure(JsonNode payload) {
        if (payload == null || !payload.isObject() || !payload.path("data").isObject()
                || !payload.path("success").isBoolean()) throw malformed();
        requireText(payload, "code", false);
        requireText(payload, "desc", false);
        requireText(payload, "signature", false);
        var data = payload.get("data");
        for (String field : new String[]{"reference", "paymentLinkId", "currency", "transactionDateTime", "code"}) {
            requireText(data, field, true);
        }
        for (String field : new String[]{"description", "accountNumber", "desc"}) requireText(data, field, false);
        for (String field : new String[]{"orderCode", "amount"}) {
            if (!data.path(field).isIntegralNumber() || !data.get(field).canConvertToLong()) throw malformed();
        }
    }

    private void requireText(JsonNode node, String field, boolean nonblank) {
        if (!node.path(field).isTextual() || nonblank && node.get(field).textValue().isBlank()) throw malformed();
    }

    private PaymentLinkException malformed() {
        return new PaymentLinkException(400, "MALFORMED_WEBHOOK", "Không thể xử lý");
    }
}
