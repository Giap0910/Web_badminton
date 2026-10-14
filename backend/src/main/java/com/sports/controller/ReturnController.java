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
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
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
        ReturnResponse response=returnService.createReturnRequest(userDetails.getId(),request);
        return ResponseEntity.status(Boolean.TRUE.equals(response.getReplayed()) ? HttpStatus.OK : HttpStatus.CREATED).body(response);
    }

    @GetMapping("/eligible-items")
    public ResponseEntity<List<ReturnResponse.EligibleItem>> getEligibleItems(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required=false) Long orderId) {
        return ResponseEntity.ok(returnService.getEligibleItems(userDetails.getId(),orderId));
    }

    @PostMapping(value="/{id}/evidence",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReturnResponse> uploadEvidence(@AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(returnService.uploadEvidence(userDetails.getId(),id,file));
    }

    @GetMapping("/{id}/evidence")
    public ResponseEntity<Resource> getEvidence(@AuthenticationPrincipal CustomUserDetails userDetails,@PathVariable Long id) {
        Resource image=new FileSystemResource(returnService.getEvidence(userDetails.getId(),id));
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).header("Cache-Control","no-store")
                .header("X-Content-Type-Options","nosniff").body(image);
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
            @RequestParam(required = false) String adminNote,
            @RequestParam(required = false) Long replacementVariantId
    ) {
        return ResponseEntity.ok(returnService.updateStatus(id,status,adminNote,replacementVariantId));
    }
}
