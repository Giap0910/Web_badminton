package com.sports.controller;

import com.sports.dto.ReviewResponse;
import com.sports.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminReviewController {

    private final ReviewService reviewService;

    public record VisibilityRequest(@NotNull(message = "Trạng thái hiển thị không được để trống") Boolean visible) {}
    public record ReplyRequest(@Size(max = 2000, message = "Phản hồi tối đa 2000 ký tự") String reply) {}

    @PutMapping("/{id}/visibility")
    public ResponseEntity<ReviewResponse> updateVisibility(@PathVariable Long id,
            @Valid @RequestBody VisibilityRequest request) {
        return ResponseEntity.ok(reviewService.updateVisibility(id, request.visible()));
    }

    @PutMapping("/{id}/reply")
    public ResponseEntity<ReviewResponse> updateReply(@PathVariable Long id,
            @Valid @RequestBody ReplyRequest request) {
        return ResponseEntity.ok(reviewService.updateReply(id, request.reply()));
    }

    @GetMapping
    public ResponseEntity<List<ReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}
