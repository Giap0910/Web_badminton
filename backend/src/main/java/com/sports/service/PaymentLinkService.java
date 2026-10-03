package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.PaymentAttempt;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class PaymentLinkService {
    private final PaymentAttemptStore store;
    private final PayOSPaymentClient client;
    public record Outcome(int status, PaymentAttemptResponse attempt) {}

    @Transactional(propagation = Propagation.NEVER)
    public Outcome create(Long orderId, Long userId, String key) {
        String validatedKey = validateKey(key);
        var prepared = store.prepare(orderId, userId, validatedKey);
        var attempt = prepared.attempt();
        if (attempt.status() == PaymentAttempt.Status.PENDING && attempt.checkoutUrl() != null) {
            return new Outcome(200, attempt);
        }
        if (prepared.created()) {
            var result = client.create(attempt);
            return new Outcome(201, store.saveResult(orderId, userId, result, true));
        }
        var recovered = client.query(attempt.orderCode());
        if (recovered == null) return new Outcome(202, attempt);
        var response = store.saveResult(orderId, userId, recovered, false);
        return new Outcome(response.status() == PaymentAttempt.Status.PENDING ? 200 : 202, response);
    }

    public PaymentAttemptResponse read(Long orderId, Long userId, boolean admin) {
        return store.read(orderId, userId, admin);
    }

    private String validateKey(String key) {
        try {
            return OrderRequestFingerprint.validateKey(key);
        } catch (com.sports.exception.BadRequestException ex) {
            throw new com.sports.exception.PaymentLinkException(400, "INVALID_IDEMPOTENCY_KEY", ex.getMessage());
        }
    }
}
