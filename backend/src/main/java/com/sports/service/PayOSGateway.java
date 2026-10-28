package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;

public interface PayOSGateway {
    PayOSPaymentClient.Result create(PaymentAttemptResponse attempt);
    PayOSPaymentClient.Result query(Long orderCode);
    PayOSPaymentClient.Query queryPayment(Long orderCode);
    PayOSPaymentClient.Query cancelPayment(Long orderCode);
}
