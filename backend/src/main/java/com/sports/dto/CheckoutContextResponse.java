package com.sports.dto;

import com.sports.entity.PaymentMethodTransition;
import java.util.List;

public record CheckoutContextResponse(OrderResponse order, PaymentAttemptResponse payment,
        long stateVersion, Eligibility eligibility, OperationContext operation) {
    public record Eligibility(boolean eligible, List<String> allowedMethods, List<String> blockedReasons) {}
    public record OperationContext(String operationId, Long sourceOrderId, Long effectiveOrderId,
            String sourcePaymentMethod, String targetPaymentMethod, PaymentMethodTransition.Status status,
            String reason, String idempotencyKey, long expectedStateVersion, String appliedAt, long retryAfterSeconds) {}
}
