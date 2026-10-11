package com.sports.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.exception.PaymentLinkException;
import com.sports.service.PaymentLedgerService;

public record PaymentTransitionRequest(String targetPaymentMethod, long expectedStateVersion) {
    public static PaymentTransitionRequest parse(JsonNode body) {
        if (body == null || !body.isObject() || body.size() != 2 || !body.path("targetPaymentMethod").isTextual()
                || !body.path("expectedStateVersion").isIntegralNumber()
                || !body.path("expectedStateVersion").canConvertToLong()) throw invalid();
        long version = body.get("expectedStateVersion").longValue();
        if (version < 0 || version > 9007199254740991L) throw invalid();
        String target = body.get("targetPaymentMethod").textValue();
        if (!"COD".equals(target) && !"PAYOS_VIETQR".equals(target)) {
            throw new PaymentLinkException(400, "INVALID_PAYMENT_METHOD", "Phương thức thanh toán không hợp lệ");
        }
        return new PaymentTransitionRequest(target, version);
    }

    public String fingerprint() {
        return PaymentLedgerService.hash(targetPaymentMethod + ":" + expectedStateVersion);
    }

    private static PaymentLinkException invalid() {
        return new PaymentLinkException(400, "INVALID_TRANSITION_INPUT", "Cần đúng phương thức và phiên bản trạng thái");
    }
}
