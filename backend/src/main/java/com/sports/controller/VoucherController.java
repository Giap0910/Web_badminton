package com.sports.controller;

import com.sports.dto.VoucherDto;
import com.sports.dto.VoucherValidateRequest;
import com.sports.dto.VoucherValidateResponse;
import com.sports.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @PostMapping("/validate")
    public ResponseEntity<VoucherValidateResponse> validateVoucher(@Valid @RequestBody VoucherValidateRequest request) {
        return ResponseEntity.ok(voucherService.validateVoucher(request));
    }

    @GetMapping("/active")
    public ResponseEntity<List<VoucherDto>> getActiveVouchers() {
        return ResponseEntity.ok(voucherService.getActiveVouchers());
    }
}
