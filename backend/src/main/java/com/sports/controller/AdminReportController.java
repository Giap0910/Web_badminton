package com.sports.controller;

import com.sports.service.AdminReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController @RequestMapping("/api/admin/reports") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {
    private final AdminReportService reports;
    @GetMapping
    public ResponseEntity<byte[]> export(@RequestParam(defaultValue = "xlsx") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] file = reports.export(from, to, format);
        String type = "csv".equals(format) ? "text/csv;charset=UTF-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=badminton-report." + format)
                .contentType(MediaType.parseMediaType(type)).body(file);
    }
}
