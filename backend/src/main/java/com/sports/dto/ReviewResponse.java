package com.sports.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productImageUrl;
    private String productBrand;
    private Long userId;
    private String username;
    private String userFullName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
