package com.sports.controller;

import com.sports.service.AdminPaymentLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/admin/payment-events") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentLogController {
    private final AdminPaymentLogService logs;
    @GetMapping public List<Map<String, Object>> recent() { return logs.recent(); }
}
