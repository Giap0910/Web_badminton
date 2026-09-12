package com.sports.controller;

import com.sports.dto.ReturnCreateRequest;
import com.sports.dto.ReturnResponse;
import com.sports.entity.ReturnStatus;
import com.sports.security.CustomUserDetails;
import com.sports.service.ReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    @PostMapping
    public ResponseEntity<ReturnResponse> createReturnRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ReturnCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(returnService.createReturnRequest(userDetails.getId(), request));
    }

    @GetMapping("/my-returns")
    public ResponseEntity<List<ReturnResponse>> getMyReturnRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(returnService.getUserReturnRequests(userDetails.getId()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReturnResponse>> getAllReturnRequests() {
        return ResponseEntity.ok(returnService.getAllReturnRequests());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReturnResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam ReturnStatus status,
            @RequestParam(required = false) String adminNote
    ) {
        return ResponseEntity.ok(returnService.updateStatus(id, status, adminNote));
    }
}
