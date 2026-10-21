package com.sports.service;

import com.sports.dto.CheckoutContextResponse.Eligibility;
import com.sports.entity.*;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class PaymentTransitionPolicy {
    private final PaymentTransitionGuard guard;
    private final com.sports.repository.PaymentMethodTransitionRepository transitions;
    @org.springframework.beans.factory.annotation.Value("${payos.mode:REAL}") private String mode = "REAL";

    public String reverseForbidden(Order order, PaymentAttempt attempt) {
        if ("MOCK".equals(mode)) return "MOCK_TRANSITION_UNSUPPORTED";
        if (order.getStatus() != OrderStatus.PENDING || !"COD".equals(order.getPaymentMethod())
                || order.getCashCollectedAt() != null) return "ORDER_NOT_ELIGIBLE";
        if (transitions.existsByOrderIdAndTargetMethod(order.getId(), "PAYOS_VIETQR")) {
            return "PAYMENT_TRANSITION_LIMIT_REACHED";
        }
        return retiredReason(order, attempt);
    }

    private String retiredReason(Order order, PaymentAttempt attempt) {
        if (attempt == null) return null;
        if (guard.needsReview(attempt) || guard.hasMoney(attempt)) return "PAYMENT_REQUIRES_REVIEW";
        if (!Set.of(PaymentAttempt.Status.CANCELLED, PaymentAttempt.Status.EXPIRED).contains(attempt.getStatus())
                || attempt.getPaymentLinkId() == null || attempt.getPaymentLinkId().isBlank()) return "PAYMENT_LINK_UNRESOLVED";
        if (!"PAYOS".equals(attempt.getProvider()) || !"VND".equals(attempt.getCurrency())
                || !Objects.equals(order.getPayosOrderCode(), attempt.getOrderCode())
                || order.getTotalAmount().compareTo(attempt.getAmount()) != 0) return "PAYMENT_REQUIRES_REVIEW";
        return null;
    }

    public void requireReverseEligible(Order order, PaymentAttempt attempt) {
        String reason = reverseForbidden(order, attempt);
        if (reason != null) throw new PaymentLinkException(409, reason, "Đơn chưa đủ điều kiện đổi sang PayOS");
        guard.checkHistory(order, null);
    }

    public String forbidden(Order order, PaymentAttempt attempt) {
        if (order.getStatus() != OrderStatus.PENDING || !"PAYOS_VIETQR".equals(order.getPaymentMethod())
                || order.getExpiresAt() == null || !order.getExpiresAt().isAfter(LocalDateTime.now())) {
            return "ORDER_NOT_ELIGIBLE";
        }
        if (attempt != null && attempt.getStatus() == PaymentAttempt.Status.PAID) return "PAYMENT_ALREADY_SETTLED";
        if (guard.needsReview(attempt) || guard.hasMoney(attempt)) return "PAYMENT_REQUIRES_REVIEW";
        if (attempt == null || attempt.getStatus() == PaymentAttempt.Status.CREATING
                || attempt.getPaymentLinkId() == null || attempt.getPaymentLinkId().isBlank()) return "PAYMENT_LINK_UNRESOLVED";
        if (!"PAYOS".equals(attempt.getProvider()) || !"VND".equals(attempt.getCurrency())
                || !Objects.equals(order.getPayosOrderCode(), attempt.getOrderCode())
                || order.getTotalAmount().compareTo(attempt.getAmount()) != 0) return "PAYMENT_REQUIRES_REVIEW";
        return null;
    }

    public Eligibility eligibility(Order order, PaymentAttempt attempt, PaymentMethodTransition op) {
        boolean active = op != null && (op.getStatus() == PaymentMethodTransition.Status.VERIFYING
                || op.getStatus() == PaymentMethodTransition.Status.NEEDS_REVIEW);
        String reason = active ? operationReason(op) : "COD".equals(order.getPaymentMethod())
                ? reverseForbidden(order, attempt) : forbidden(order, attempt);
        try { guard.checkHistory(order, attempt); }
        catch (PaymentLinkException ex) { reason = ex.getCode(); }
        if (reason == null) return new Eligibility(true, List.of("PAYOS_VIETQR", "COD"), List.of());
        boolean continuePayos = !active && "PAYMENT_LINK_UNRESOLVED".equals(reason);
        return new Eligibility(false, continuePayos ? List.of("PAYOS_VIETQR") : List.of(), List.of(reason));
    }

    private String operationReason(PaymentMethodTransition op) {
        if (op.getStatus() == PaymentMethodTransition.Status.VERIFYING) return "PAYMENT_TRANSITION_IN_PROGRESS";
        if (op.getStatus() == PaymentMethodTransition.Status.NEEDS_REVIEW) return "PAYMENT_REQUIRES_REVIEW";
        if (guard.needsReview(op.getPaymentAttempt()) || guard.hasMoney(op.getPaymentAttempt())) return "PAYMENT_REQUIRES_REVIEW";
        return op.getReason() == null ? "ORDER_NOT_ELIGIBLE" : op.getReason();
    }

    public void requireEligible(Order order, PaymentAttempt attempt) {
        String reason = forbidden(order, attempt);
        if (reason != null) throw new PaymentLinkException(409, reason, "Đơn chưa đủ điều kiện đổi phương thức");
    }

    public boolean zero(PayOSPaymentClient.Query proof) {
        return proof.amountPaid().signum() == 0 && proof.amountRemaining().compareTo(proof.amount()) == 0
                && proof.transactions().isEmpty();
    }

    public void requireKnown(PayOSPaymentClient.Query proof) {
        if (!Set.of("PENDING", "FAILED", "PAID", "UNDERPAID", "PROCESSING", "CANCELLED", "EXPIRED").contains(proof.status())) {
            throw new PaymentLinkException(502, "PAYOS_INVALID_RESPONSE", "Trạng thái cổng thanh toán không hợp lệ");
        }
    }
}

