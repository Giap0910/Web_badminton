package com.sports.mockpayos;

import com.fasterxml.jackson.databind.JsonNode;
import com.sports.security.CustomUserDetails;
import com.sports.service.PaymentEnvironmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@RestController @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
@RequestMapping("/api/dev/mock-payos") @PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class MockPayOSController {
    private final MockPayOSActionService actions;
    private final PaymentEnvironmentService environment;
    @PostMapping("/orders/{id}/actions")
    public ResponseEntity<MockPayOSActionStore.Response> submit(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails actor,
            @RequestHeader(value="Idempotency-Key",required=false) String key,@RequestBody JsonNode body) {
        environment.requireMock();
        var result=actions.submit(id,actor.getId(),key,body);
        if ("VERIFYING".equals(result.action().status())) {
            return ResponseEntity.accepted().header("Retry-After",Long.toString(Math.max(1,result.action().retryAfterSeconds()))).body(result);
        }
        return ResponseEntity.ok(result);
    }
}
