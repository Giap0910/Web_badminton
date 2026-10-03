package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class PaymentAttemptStore {
    private final OrderRepository orders;
    private final PaymentAttemptRepository attempts;

    public record Prepared(PaymentAttemptResponse attempt, boolean created) {}

    @Transactional
    public Prepared prepare(Long orderId, Long userId, String key) {
        Order order = ownedOrder(orderId, userId, false);
        validateEligible(order);
        var existing = attempts.findByOrderId(orderId);
        if (existing.isPresent()) return new Prepared(PaymentAttemptResponse.from(existing.get()), false);
        PaymentAttempt attempt = new PaymentAttempt();
        attempt.setOrder(order);
        attempt.setOrderCode(order.getPayosOrderCode());
        attempt.setAmount(VndAmount.requireValid(order.getTotalAmount()));
        attempt.setExpiresAt(order.getExpiresAt());
        attempt.setIdempotencyKey(key);
        return new Prepared(PaymentAttemptResponse.from(attempts.saveAndFlush(attempt)), true);
    }

    @Transactional
    public PaymentAttemptResponse saveResult(Long orderId, Long userId, PayOSPaymentClient.Result result,
            boolean created) {
        Order order = ownedOrder(orderId, userId, false);
        PaymentAttempt attempt = attempts.findByOrderId(orderId).orElseThrow();
        if (attempt.getStatus() == PaymentAttempt.Status.PENDING) return PaymentAttemptResponse.from(attempt);
        if (!attempt.getOrderCode().equals(result.orderCode())
                || attempt.getAmount().compareTo(result.amount()) != 0
                || attempt.getPaymentLinkId() != null && !attempt.getPaymentLinkId().equals(result.paymentLinkId())) {
            throw new PaymentLinkException(502, "PAYMENT_IDENTITY_MISMATCH", "Thông tin thanh toán không khớp");
        }
        attempt.setPaymentLinkId(result.paymentLinkId());
        if (created) {
            validateEligible(order);
            attempt.setCheckoutUrl(result.checkoutUrl());
            attempt.setQrPayload(result.qrPayload());
            attempt.setStatus(PaymentAttempt.Status.PENDING);
        }
        return PaymentAttemptResponse.from(attempts.saveAndFlush(attempt));
    }

    @Transactional(readOnly = true)
    public PaymentAttemptResponse read(Long orderId, Long userId, boolean admin) {
        Order order = orders.findById(orderId).orElseThrow(() -> missing());
        authorize(order, userId, admin);
        return attempts.findByOrderId(orderId).map(PaymentAttemptResponse::from).orElse(null);
    }

    private Order ownedOrder(Long id, Long userId, boolean admin) {
        Order order = orders.findByIdForUpdate(id).orElseThrow(() -> missing());
        authorize(order, userId, admin);
        return order;
    }

    private void authorize(Order order, Long userId, boolean admin) {
        if (!admin && !order.getUser().getId().equals(userId)) {
            throw new PaymentLinkException(403, "PAYMENT_FORBIDDEN", "Bạn không có quyền truy cập đơn này");
        }
    }

    private void validateEligible(Order order) {
        if (!"PAYOS_VIETQR".equals(order.getPaymentMethod()) || order.getStatus() != OrderStatus.PENDING
                || order.getExpiresAt() == null || !order.getExpiresAt().isAfter(LocalDateTime.now())
                || order.getPayosOrderCode() == null) {
            throw new PaymentLinkException(409, "ORDER_NOT_PAYABLE", "Đơn không đủ điều kiện thanh toán");
        }
        VndAmount.requireValid(order.getTotalAmount()).longValueExact();
    }

    private PaymentLinkException missing() {
        return new PaymentLinkException(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng");
    }
}
