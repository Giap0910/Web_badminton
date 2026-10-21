package com.sports.service;

import com.sports.dto.OrderResponse;
import com.sports.entity.OrderStatus;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @RequiredArgsConstructor
public class OrderStatusService {
    private final OrderService orders;
    private final PaymentTransitionStore transitions;
    private final PayOSGateway client;
    private final PaymentTransitionPolicy policy;

    @Transactional(propagation = Propagation.NEVER)
    public OrderResponse update(Long id, OrderStatus target) {
        if (target != OrderStatus.SHIPPING && target != OrderStatus.COMPLETED) return orders.updateOrderStatus(id, target);
        for (var old : transitions.retiredHistory(id)) {
            var proof = client.queryPayment(old.code());
            if (proof == null) throw new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "Chưa xác minh được QR cũ");
            policy.requireKnown(proof);
            if (!transitions.verifyRetired(old, proof)) throw PaymentTransitionGuard.reviewRequired();
        }
        var runner = transitions.delivery(id);
        if (runner == null) return orders.updateOrderStatus(id, target);
        var proof = client.queryPayment(runner.code());
        if (proof == null) throw new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "Chưa xác minh được thanh toán");
        policy.requireKnown(proof);
        if (!transitions.deliveryProof(runner, proof)) throw PaymentTransitionGuard.reviewRequired();
        return orders.updateOrderStatus(id, target, proof);
    }
}

