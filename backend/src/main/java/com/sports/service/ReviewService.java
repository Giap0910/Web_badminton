package com.sports.service;

import com.sports.dto.ReviewRequest;
import com.sports.dto.ReviewResponse;
import com.sports.entity.Product;
import com.sports.entity.Review;
import com.sports.entity.User;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ProductRepository;
import com.sports.repository.ReviewRepository;
import com.sports.repository.UserRepository;
import com.sports.security.HtmlSanitizerUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public List<ReviewResponse> getReviewsByProduct(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReviewResponse addReview(Long userId, ReviewRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + request.getProductId()));

        // Anti-Stored XSS: Clean user comments
        String cleanComment = HtmlSanitizerUtil.sanitizeToPlainText(request.getComment());

        Review review = Review.builder()
                .user(user)
                .product(product)
                .rating(request.getRating())
                .comment(cleanComment)
                .build();

        return toDto(reviewRepository.save(review));
    }

    public Double getAverageRating(Long productId) {
        List<Review> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
        if (reviews.isEmpty()) {
            return 5.0; // default initial rating
        }
        return reviews.stream().mapToInt(Review::getRating).average().orElse(5.0);
    }

    public int getReviewCount(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).size();
    }

    public List<ReviewResponse> getUserReviews(Long userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll().stream()
                .sorted((r1, r2) -> r2.getCreatedAt().compareTo(r1.getCreatedAt()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteReview(Long id) {
        if (!reviewRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + id);
        }
        reviewRepository.deleteById(id);
    }

    private ReviewResponse toDto(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .productName(review.getProduct().getName())
                .productImageUrl(review.getProduct().getImageUrl())
                .productBrand(review.getProduct().getBrand())
                .userId(review.getUser().getId())
                .username(review.getUser().getUsername())
                .userFullName(review.getUser().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
