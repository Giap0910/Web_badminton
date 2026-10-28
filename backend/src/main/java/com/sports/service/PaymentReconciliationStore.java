package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.PaymentReconciliationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class PaymentReconciliationStore {
    private final PaymentReconciliationRepository requests;
    private final PaymentSettlementService settlement;
    private final PaymentLedgerService ledger;
    public record Prepared(PaymentAttemptResponse attempt, boolean completed) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Prepared prepare(Long id, Long actor, String key, String reason) {
        var attempt = settlement.lockAttempt(id);
        if (!"PAYOS".equals(attempt.getProvider()) || attempt.getPaymentLinkId() == null) {
            throw new PaymentLinkException(409, "PAYMENT_NOT_RECONCILABLE", "Giao dịch chưa có định danh PayOS đầy đủ");
        }
        var request = requests.findByPaymentAttemptIdAndIdempotencyKey(id, key)
                .orElseGet(() -> create(attempt, actor, key, reason));
        if (!request.getReason().equals(reason)) {
            throw new PaymentLinkException(409, "IDEMPOTENCY_CONFLICT", "Khóa đối soát đã được dùng cho lý do khác");
        }
        return new Prepared(PaymentAttemptResponse.from(attempt), request.isCompleted());
    }

    private PaymentReconciliation create(PaymentAttempt attempt, Long actor, String key, String reason) {
        var request = new PaymentReconciliation();
        request.setPaymentAttempt(attempt);
        request.setActorId(actor);
        request.setIdempotencyKey(key);
        request.setReason(reason);
        return requests.saveAndFlush(request);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PaymentSettlementService.Outcome complete(Long id, String key, PayOSPaymentClient.Query query) {
        var attempt = settlement.lockAttempt(id);
        var request = requests.findByPaymentAttemptIdAndIdempotencyKey(id, key).orElseThrow();
        if (request.isCompleted()) return new PaymentSettlementService.Outcome(200, PaymentAttemptResponse.from(attempt));
        audit(request, query);
        var result = settlement.query(id, query);
        request.setHttpStatus(result.status());
        request.setCompleted(result.status() == 200);
        if (request.isCompleted()) request.setCompletedAt(LocalDateTime.now());
        return result;
    }

    private void audit(PaymentReconciliation request, PayOSPaymentClient.Query query) {
        String proof = ledger.serialize(query);
        String hash = PaymentLedgerService.hash(proof);
        if (hash.equals(request.getLastEvidenceHash())) return;
        String previous = request.getEvidenceHistory();
        request.setEvidenceHistory((previous == null ? "" : previous + "\n") + proof);
        request.setLastEvidenceHash(hash);
    }
}
