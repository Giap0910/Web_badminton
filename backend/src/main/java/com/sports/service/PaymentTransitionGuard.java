package com.sports.service;

import com.sports.entity.*;
import com.sports.repository.*;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class PaymentTransitionGuard {
    private final PaymentMethodTransitionRepository transitions;
    private final PaymentAttemptRepository attempts;
    private final PaymentLedgerService ledger;

    public void checkLink(Order order) {
        if (transitions.findByOrderId(order.getId()).isPresent()) throw conflict();
    }

    public PaymentMethodTransition lock(Order order) {
        attempts.findByOrderId(order.getId()).ifPresent(a -> attempts.findByIdForUpdate(a.getId()));
        return transitions.findByOrderIdForUpdate(order.getId()).orElse(null);
    }

    public boolean hasMoney(PaymentAttempt attempt) {
        return attempt != null && (attempt.getStatus() == PaymentAttempt.Status.PAID
                || ledger.received(attempt.getId()).stream().anyMatch(e -> e.getAmount().signum() > 0));
    }

    public boolean needsReview(PaymentAttempt attempt) {
        return attempt != null && (attempt.getStatus() == PaymentAttempt.Status.NEEDS_REVIEW
                || ledger.hasHardConflict(attempt.getId()));
    }

    public void checkCancel(Order order) {
        var op = lock(order);
        if (op == null) return;
        if (op.getStatus() == PaymentMethodTransition.Status.VERIFYING) throw conflict();
        checkMoney(op.getPaymentAttempt());
    }

    public void checkDelivery(Order order, OrderStatus target, PayOSPaymentClient.Query proof) {
        var op = lock(order);
        if (op == null) return;
        if (op.getStatus() == PaymentMethodTransition.Status.VERIFYING) throw conflict();
        checkMoney(op.getPaymentAttempt());
        if (!"COD".equals(order.getPaymentMethod()) || target == OrderStatus.CANCELLED) return;
        if (target != OrderStatus.SHIPPING && target != OrderStatus.COMPLETED) return;
        if (op.getStatus() != PaymentMethodTransition.Status.APPLIED || !safeTerminal(op, proof)) {
            throw new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "Cần xác minh thanh toán trước khi giao hoặc hoàn tất");
        }
    }

    public boolean safeTerminal(PaymentMethodTransition op, PayOSPaymentClient.Query proof) {
        return proof != null && op.getProviderOrderCode().equals(proof.orderCode())
                && op.getProviderLinkId().equals(proof.paymentLinkId()) && op.getAmount().compareTo(proof.amount()) == 0
                && ("CANCELLED".equals(proof.status()) || "EXPIRED".equals(proof.status()))
                && proof.amountPaid().signum() == 0 && proof.amountRemaining().compareTo(op.getAmount()) == 0
                && proof.transactions().isEmpty();
    }

    public void checkMoney(PaymentAttempt attempt) {
        if (hasMoney(attempt) || needsReview(attempt)) throw reviewRequired();
    }

    public void paymentChanged(PaymentAttempt attempt) {
        var op = transitions.findByOrderIdForUpdate(attempt.getOrder().getId()).orElse(null);
        if (op == null || op.getStatus() != PaymentMethodTransition.Status.VERIFYING) return;
        if (attempt.getOrder().getStatus() == OrderStatus.PAID) finish(op, "PAYMENT_ALREADY_SETTLED", false);
        else if (needsReview(attempt) || hasMoney(attempt)) finish(op, "PAYMENT_REQUIRES_REVIEW", true);
    }

    public void expired(Order order) {
        var op = lock(order);
        if (op != null && op.getStatus() == PaymentMethodTransition.Status.VERIFYING) {
            finish(op, "ORDER_NOT_ELIGIBLE", false);
        }
    }

    private void finish(PaymentMethodTransition op, String reason, boolean review) {
        op.setStatus(review ? PaymentMethodTransition.Status.NEEDS_REVIEW : PaymentMethodTransition.Status.REJECTED);
        op.setReason(reason);
        op.setFinishedAt(LocalDateTime.now());
        op.setUpdatedAt(LocalDateTime.now());
        CheckoutRevision.touch(op.getOrder());
    }

    public static PaymentLinkException conflict() {
        return new PaymentLinkException(409, "PAYMENT_TRANSITION_CONFLICT", "Đơn đã có yêu cầu chuyển phương thức");
    }

    public static PaymentLinkException reviewRequired() {
        return new PaymentLinkException(409, "PAYMENT_REQUIRES_REVIEW", "Thanh toán cần được đối soát");
    }
}
