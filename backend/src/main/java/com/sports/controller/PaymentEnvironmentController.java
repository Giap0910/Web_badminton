package com.sports.controller;

import com.sports.dto.PaymentEnvironmentResponse;
import com.sports.service.PaymentEnvironmentService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController @RequestMapping("/api/payment")
public class PaymentEnvironmentController {
    private final PaymentEnvironmentService environment;
    public PaymentEnvironmentController(PaymentEnvironmentService environment) { this.environment=environment; }
    @GetMapping("/environment") @PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")
    public PaymentEnvironmentResponse read(Authentication authentication) { return environment.read(authentication); }
}
