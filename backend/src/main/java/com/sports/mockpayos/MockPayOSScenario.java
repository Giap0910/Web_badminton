package com.sports.mockpayos;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.exception.PaymentLinkException;

public enum MockPayOSScenario {
    PAYMENT_PAID_WEBHOOK, PAYMENT_PAID_QUERY, PAYMENT_FAILED, PAYMENT_CANCELLED, PAYMENT_EXPIRED,
    NON_SUCCESS_WEBHOOK, PARTIAL_PAYMENT, REPLAY_WEBHOOK, CONFLICTING_WEBHOOK,
    LATE_PAYMENT_WEBHOOK, LATE_PAYMENT_QUERY, ARM_CREATE_TIMEOUT_BEFORE, ARM_CREATE_TIMEOUT_AFTER,
    ARM_QUERY_TIMEOUT_BEFORE, ARM_QUERY_TIMEOUT_AFTER, ARM_CANCEL_TIMEOUT_BEFORE, ARM_CANCEL_TIMEOUT_AFTER,
    ARM_QUERY_502, ARM_QUERY_503, ARM_QUERY_504, ARM_QUERY_UNKNOWN, ARM_CANCEL_PROCESSING,
    COMPLETE_CANCEL_ZERO, CLEAR_FAULTS, COMPLETE_CREATE, RECOVER_CREATE;

    public static MockPayOSScenario parse(JsonNode body) {
        if (body==null || !body.isObject() || body.size()!=1 || !body.path("scenario").isTextual()) throw invalid();
        try { return valueOf(body.get("scenario").textValue()); }
        catch (IllegalArgumentException ex) { throw invalid(); }
    }

    private static PaymentLinkException invalid() {
        return new PaymentLinkException(400,"INVALID_MOCK_ACTION","Kịch bản mô phỏng không hợp lệ");
    }
}
