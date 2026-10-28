package com.sports.dto;

public record PaymentTransitionResponse(CheckoutContextResponse.OperationContext operation,
        OrderResponse order, PaymentAttemptResponse payment, long stateVersion, boolean replay) {}
