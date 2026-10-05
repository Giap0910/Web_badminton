package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class PaymentSettlementService {
    private final PaymentAttemptRepository attempts;
    private final OrderRepository orders;
    private final PaymentLedgerService ledger;
    private final OrderService orderService;
    private final EntityManager entityManager;
    public record Outcome(int status, PaymentAttemptResponse attempt) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void webhook(PaymentEvidence proof) {
        var attempt = candidate(proof);
        boolean matched = attempt != null && identityMatches(attempt, proof);
        var receipt = ledger.record(proof, matched ? attempt : null);
        if (receipt.conflict()) { review(attempt, List.of(receipt.event()), "EVENT_IDENTITY_CONFLICT"); return; }
        if (receipt.duplicate()) return;
        if (attempt == null) { review(null, List.of(receipt.event()), "UNMATCHED_PROVIDER_EVENT"); return; }
        if (attempt.getStatus() == PaymentAttempt.Status.PAID && !proof.successful()) {
            recordReview(receipt.event(), "NON_SETTLING", "NON_SUCCESS_PROVIDER_EVENT");
            return;
        }
        String reason = webhookReason(attempt, proof);
        if (reason != null) { review(attempt, List.of(receipt.event()), reason); return; }
        settle(attempt, List.of(receipt.event()), proof.paidAt());
    }

    public PaymentAttempt lockAttempt(Long id) {
        var peek = attempts.findById(id).orElseThrow(this::missing);
        Order order = orders.findByIdForUpdate(peek.getOrder().getId()).orElseThrow(this::missing);
        entityManager.refresh(order, LockModeType.PESSIMISTIC_WRITE);
        var attempt = attempts.findByIdForUpdate(id).orElseThrow(this::missing);
        entityManager.refresh(attempt, LockModeType.PESSIMISTIC_WRITE);
        return attempt;
    }

    private PaymentAttempt candidate(PaymentEvidence proof) {
        var found = attempts.findByPaymentLinkId(proof.paymentLinkId());
        if (found.isEmpty()) found = attempts.findByOrderCode(proof.orderCode());
        return found.map(a -> lockAttempt(a.getId())).orElse(null);
    }

    private boolean identityMatches(PaymentAttempt attempt, PaymentEvidence proof) {
        return "PAYOS".equals(attempt.getProvider()) && proof.paymentLinkId().equals(attempt.getPaymentLinkId())
                && proof.orderCode().equals(attempt.getOrderCode())
                && attempt.getOrderCode().equals(attempt.getOrder().getPayosOrderCode())
                && "PAYOS_VIETQR".equals(attempt.getOrder().getPaymentMethod());
    }

    private String webhookReason(PaymentAttempt attempt, PaymentEvidence proof) {
        if (!identityMatches(attempt, proof)) return "IDENTITY_MISMATCH";
        if (!"VND".equals(proof.currency()) || !proof.currency().equals(attempt.getCurrency())) return "CURRENCY_MISMATCH";
        if (!expectedAmount(attempt, proof.amount())) return "AMOUNT_MISMATCH";
        if (!proof.successful()) return "NON_SUCCESS_PROVIDER_EVENT";
        if (proof.paidAt() == null) return "INVALID_TRANSACTION_TIME";
        return null;
    }

    private boolean expectedAmount(PaymentAttempt attempt, BigDecimal amount) {
        try {
            VndAmount.requireValid(attempt.getAmount());
            VndAmount.requireValid(attempt.getOrder().getTotalAmount());
            return attempt.getAmount().compareTo(amount) == 0
                    && attempt.getAmount().compareTo(attempt.getOrder().getTotalAmount()) == 0;
        } catch (com.sports.exception.BadRequestException ex) { return false; }
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Outcome query(Long attemptId, PayOSPaymentClient.Query query) {
        var attempt = lockAttempt(attemptId);
        if (query == null) return outcome(202, attempt);
        if (!queryIdentity(attempt, query)) { review(attempt, List.of(), "IDENTITY_MISMATCH"); return outcome(200, attempt); }
        var proofs = query.transactions().stream().map(t -> evidence(query, t)).toList();
        var receipts = proofs.stream().sorted(Comparator.comparing(PaymentEvidence::reference))
                .map(p -> ledger.record(p, attempt)).toList();
        if (receipts.stream().anyMatch(PaymentLedgerService.Receipt::conflict)) {
            review(attempt, eventRows(receipts), "EVENT_IDENTITY_CONFLICT"); return outcome(200, attempt);
        }
        String reason = queryReason(attempt, query, proofs);
        if (reason != null) { review(attempt, eventRows(receipts), reason); return outcome(200, attempt); }
        if (proofs.isEmpty()) return outcome(202, attempt);
        if (!"PAID".equals(query.status())) {
            review(attempt, eventRows(receipts), "PAYMENT_NOT_CONFIRMED"); return outcome(202, attempt);
        }
        applyQuery(attempt, receipts, proofs);
        return outcome(200, attempt);
    }

    private void applyQuery(PaymentAttempt attempt, List<PaymentLedgerService.Receipt> receipts, List<PaymentEvidence> proofs) {
        receipts.forEach(r -> ledger.bind(r.event(), attempt));
        settle(attempt, eventRows(receipts), proofs.stream().map(PaymentEvidence::paidAt).max(LocalDateTime::compareTo).orElseThrow());
    }

    private boolean queryIdentity(PaymentAttempt attempt, PayOSPaymentClient.Query query) {
        return "PAYOS".equals(attempt.getProvider()) && "PAYOS_VIETQR".equals(attempt.getOrder().getPaymentMethod())
                && Objects.equals(attempt.getPaymentLinkId(), query.paymentLinkId())
                && Objects.equals(attempt.getOrderCode(), query.orderCode())
                && Objects.equals(attempt.getOrder().getPayosOrderCode(), query.orderCode());
    }

    private PaymentEvidence evidence(PayOSPaymentClient.Query query, PayOSPaymentClient.Transaction tx) {
        return new PaymentEvidence(query.paymentLinkId(), query.orderCode(), tx.reference(), tx.amount(),
                "VND", tx.transactionDateTime(), true, PaymentEvent.Source.RECONCILE_QUERY);
    }

    private String queryReason(PaymentAttempt attempt, PayOSPaymentClient.Query query, List<PaymentEvidence> proofs) {
        if (!"VND".equals(attempt.getCurrency())) return "CURRENCY_MISMATCH";
        if (!expectedAmount(attempt, query.amount())) return "AMOUNT_MISMATCH";
        if (proofs.stream().anyMatch(p -> p.paidAt() == null)) return "INVALID_TRANSACTION_TIME";
        if (proofs.stream().anyMatch(p -> p.amount().signum() <= 0)
                || proofs.stream().map(PaymentEvidence::reference).distinct().count() != proofs.size()) return "TRANSACTION_EVIDENCE_MISMATCH";
        if (!"PAID".equals(query.status()) || proofs.isEmpty()) return null;
        BigDecimal total = proofs.stream().map(PaymentEvidence::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (query.amountPaid().compareTo(attempt.getAmount()) != 0 || query.amountRemaining().signum() != 0
                || total.compareTo(attempt.getAmount()) != 0) return "AMOUNT_MISMATCH";
        Set<String> references = new HashSet<>(proofs.stream().map(PaymentEvidence::reference).toList());
        if (ledger.received(attempt.getId()).stream().anyMatch(e -> !references.contains(e.getReference()))) return "TRANSACTION_EVIDENCE_MISMATCH";
        return null;
    }

    private List<PaymentEvent> eventRows(List<PaymentLedgerService.Receipt> receipts) {
        return receipts.stream().map(PaymentLedgerService.Receipt::event).distinct().toList();
    }

    private void settle(PaymentAttempt attempt, List<PaymentEvent> events, LocalDateTime paidAt) {
        if (attempt.getStatus() == PaymentAttempt.Status.PAID && alreadyFulfilled(attempt.getOrder())) {
            if (events.stream().allMatch(e -> "PAID".equals(e.getProcessingResult()))) return;
            review(attempt, events, "EXTRA_PAYMENT"); return;
        }
        String reason = eligibilityReason(attempt);
        if (reason != null) { review(attempt, events, reason); return; }
        var accounted = new LinkedHashMap<Long, PaymentEvent>();
        ledger.received(attempt.getId()).forEach(e -> accounted.put(e.getId(), e));
        events.forEach(e -> accounted.put(e.getId(), e));
        BigDecimal received = accounted.values().stream().map(PaymentEvent::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (received.compareTo(attempt.getAmount()) != 0) { review(attempt, events, "EXTRA_PAYMENT"); return; }
        orderService.handlePaymentSuccess(attempt.getOrderCode(), attempt.getAmount());
        attempt.setStatus(PaymentAttempt.Status.PAID);
        attempt.setReference(events.size() == 1 ? events.get(0).getReference() : null);
        attempt.setPaidAt(paidAt);
        attempt.setReviewReason(null);
        events.forEach(e -> { e.setProcessingResult("PAID"); e.setReviewReason(null); });
    }

    private String eligibilityReason(PaymentAttempt attempt) {
        var order = attempt.getOrder();
        if (order.getStatus() == OrderStatus.CANCELLED) return "LATE_PAYMENT_CANCELLED_ORDER";
        var now = LocalDateTime.now();
        if (order.getExpiresAt() == null || !order.getExpiresAt().isAfter(now) || attempt.getExpiresAt() == null
                || !attempt.getExpiresAt().isAfter(now) || attempt.getStatus() == PaymentAttempt.Status.EXPIRED) return "LATE_PAYMENT_EXPIRED";
        if (order.getStatus() != OrderStatus.PENDING || Set.of(PaymentAttempt.Status.CANCELLED, PaymentAttempt.Status.FAILED,
                PaymentAttempt.Status.PAID).contains(attempt.getStatus())) return "PAYMENT_STATE_INELIGIBLE";
        String review = attempt.getReviewReason();
        if (ledger.hasHardConflict(attempt.getId()) || attempt.getStatus() == PaymentAttempt.Status.NEEDS_REVIEW
                && !Set.of("AMOUNT_MISMATCH", "NON_SUCCESS_PROVIDER_EVENT", "PAYMENT_NOT_CONFIRMED")
                        .contains(review == null ? "" : review)) return review == null ? "PAYMENT_REQUIRES_REVIEW" : review;
        return null;
    }

    private boolean alreadyFulfilled(Order order) {
        return Set.of(OrderStatus.PAID, OrderStatus.SHIPPING, OrderStatus.COMPLETED).contains(order.getStatus());
    }

    private void review(PaymentAttempt attempt, List<PaymentEvent> events, String reason) {
        if (attempt != null && attempt.getStatus() == PaymentAttempt.Status.PAID && "EXTRA_PAYMENT".equals(reason)) {
            events.forEach(e -> recordReview(e, "NEEDS_REVIEW", reason));
            return;
        }
        if (attempt != null) {
            String previous = attempt.getReviewReason();
            boolean hardBlock = attempt.getStatus() == PaymentAttempt.Status.NEEDS_REVIEW && previous != null
                    && !Set.of("AMOUNT_MISMATCH", "NON_SUCCESS_PROVIDER_EVENT", "PAYMENT_NOT_CONFIRMED").contains(previous);
            attempt.setStatus(PaymentAttempt.Status.NEEDS_REVIEW);
            attempt.setReviewReason(hardBlock ? previous : reason);
            var received = ledger.received(attempt.getId());
            if (!received.isEmpty()) attempt.setReference(received.size() == 1 ? received.get(0).getReference() : null);
        }
        events.forEach(e -> recordReview(e, attempt == null ? "UNMATCHED" : "NEEDS_REVIEW", reason));
    }

    private void recordReview(PaymentEvent event, String result, String reason) {
        String previous = event.getReviewHistory();
        event.setReviewHistory((previous == null ? "" : previous + "\n") + LocalDateTime.now() + " " + reason);
        event.setProcessingResult(result);
        event.setReviewReason(reason);
    }

    private Outcome outcome(int status, PaymentAttempt attempt) {
        return new Outcome(status, PaymentAttemptResponse.from(attempt));
    }

    private PaymentLinkException missing() {
        return new PaymentLinkException(404, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch thanh toán");
    }
}
