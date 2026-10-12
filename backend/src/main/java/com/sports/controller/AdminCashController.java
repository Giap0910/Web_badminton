package com.sports.controller;

import com.sports.dto.OrderResponse;
import com.sports.security.CustomUserDetails;
import com.sports.service.CashCollectionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController @RequestMapping("/api/admin/orders") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminCashController {
    private final CashCollectionService cash;
    public record Request(@NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 10, fraction = 0) BigDecimal amount) {}

    @PostMapping("/{id}/cash-collection")
    public OrderResponse collect(@PathVariable Long id, @Valid @RequestBody Request request,
            @AuthenticationPrincipal CustomUserDetails actor) {
        return cash.collect(id, actor.getId(), request.amount());
    }
}
