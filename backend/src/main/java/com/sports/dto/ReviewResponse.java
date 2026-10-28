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
    private Boolean productDeleted;
    private String productImageUrl;
    private String productBrand;
    private String productSku;
    private Long orderId;
    private Long orderItemId;
    private String selectedSize;
    private String selectedColor;
    private String selectedWeight;
    private String purchasedSpec;
    private Boolean visible;
    private Boolean verifiedPurchase;
    private String officialReply;
    private LocalDateTime replyUpdatedAt;
    private Long userId;
    private String username;
    private String userFullName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
