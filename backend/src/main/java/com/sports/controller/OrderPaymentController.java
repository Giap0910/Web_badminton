package com.sports.controller;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.security.CustomUserDetails;
import com.sports.service.PaymentLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/orders") @RequiredArgsConstructor
public class OrderPaymentController {
    private final PaymentLinkService service;

    @PostMapping("/{id}/payment-link")
    public ResponseEntity<PaymentAttemptResponse> create(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        var outcome = service.create(id, principal.getId(), key);
        return ResponseEntity.status(outcome.status()).body(outcome.attempt());
    }

    @GetMapping("/{id}/payment")
    public ResponseEntity<PaymentAttemptResponse> read(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        boolean admin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(service.read(id, principal.getId(), admin));
    }
}
