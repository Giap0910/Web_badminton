package com.sports.mockpayos;

import com.sports.entity.*;
import com.sports.repository.*;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
public class MockPayOSRecovery {
    private final OrderRepository orders;
    private final PaymentAttemptRepository attempts;
    private final MockPayOSStateRepository states;
    private final PaymentTransitionGuard guard;
    private final MockPayOSProof proof;
    private final PaymentAttemptStore merchant;

    @Transactional
    public void complete(Long id) {
        var order=orders.findByIdForUpdate(id).orElseThrow(MockPayOSStore::missing);
        var candidate=attempts.findByOrderId(id).orElseThrow(MockPayOSStore::missing);
        var attempt=attempts.findByIdForUpdate(candidate.getId()).orElseThrow(MockPayOSStore::missing);
        var state=states.lockCode(attempt.getOrderCode()).orElseThrow(MockPayOSStore::missing);
        guard.checkLink(order);
        requireSafe(order,attempt,state);
        var original=proof.decode(state.getOriginalCreateResult());
        var result=proof.authenticated(original.get("result"),PayOSPaymentClient.Result.class);
        if (!attempt.getIdempotencyKey().equals(original.path("key").asText())
                || !attempt.getId().toString().equals(original.path("intent").asText())
                || !state.getPaymentLinkId().equals(result.paymentLinkId())) throw MockPayOSProof.invalid();
        merchant.saveResult(id,order.getUser().getId(),result,true);
    }

    private void requireSafe(com.sports.entity.Order order,PaymentAttempt attempt,MockPayOSState state) {
        if (!"CREATED".equals(state.getCreateEffectStatus()) || !"PENDING".equals(state.getProviderStatus())
                || state.getAmountPaid().signum()!=0 || !"[]".equals(state.getTransactionsJson())
                || state.getAmountRemaining().compareTo(state.getAmount())!=0
                || attempt.getStatus()!=PaymentAttempt.Status.CREATING || guard.hasMoney(attempt) || guard.needsReview(attempt)
                || order.getStatus()!=OrderStatus.PENDING || !"PAYOS_VIETQR".equals(order.getPaymentMethod())
                || !order.getExpiresAt().isAfter(LocalDateTime.now()) || !state.getPaymentAttemptId().equals(attempt.getId())
                || state.getAmount().compareTo(attempt.getAmount())!=0 || !state.getExpiresAt().equals(attempt.getExpiresAt())) {
            throw MockPayOSStore.conflict("PAYMENT_LINK_UNRESOLVED");
        }
    }
}
