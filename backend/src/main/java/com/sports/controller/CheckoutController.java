package com.sports.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.dto.*;
import com.sports.security.CustomUserDetails;
import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/orders") @RequiredArgsConstructor
public class CheckoutController {
    private final PaymentTransitionStore store;
    private final PaymentTransitionService transitions;

    @GetMapping("/{id}/checkout-context")
    public CheckoutContextResponse context(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails principal) {
        return store.context(id, principal == null ? null : principal.getId());
    }

    @PostMapping("/{id}/payment-method-transitions")
    public ResponseEntity<PaymentTransitionResponse> transition(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody JsonNode body) {
        var result = transitions.submit(id, principal == null ? null : principal.getId(), key, body);
        var response = ResponseEntity.status(result.status());
        if (result.status() == 202) response.header("Retry-After", String.valueOf(Math.max(1, result.body().operation().retryAfterSeconds())));
        return response.body(result.body());
    }
}

