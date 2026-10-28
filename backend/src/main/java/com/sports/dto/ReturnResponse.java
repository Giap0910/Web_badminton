package com.sports.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnResponse {
    private Long id;
    private Long orderId;
    private Long userId;
    private String userFullName;
    private String reason;
    private String imageUrl;
    private String status;
    private String adminNote;
    private LocalDateTime createdAt;
    private Long orderItemId;
    private Long productIdSnapshot;
    private Long categoryIdSnapshot;
    private String brandSnapshot;
    private String productName;
    private String productSku;
    private Boolean productDeleted;
    private Long originalVariantId;
    private String selectedSize;
    private String selectedColor;
    private String selectedWeight;
    private Integer quantity;
    private String serialNumber;
    private String customerPhone;
    private LocalDateTime warrantyDeadline;
    private LocalDateTime orderCompletedAt;
    private LocalDateTime completedAt;
    private Boolean evidenceAvailable;
    private Boolean replayed;
    private Long replacementVariantId;
    private Long replacementProductId;
    private String replacementSku;
    private String replacementProductName;
    private String replacementColor;
    private String replacementSize;
    private String replacementWeightGrip;
    private String replacementPackaging;
    public record EligibleItem(Long orderId,Long orderItemId,Long productId,boolean productDeleted,String productName,
            String productSku,String productBrand,Long categoryId,Long originalVariantId,String selectedSize,String selectedColor,
            String selectedWeight,int purchasedQuantity,int claimedQuantity,int remainingQuantity,Long activeRequestId,
            LocalDateTime warrantyDeadline,boolean eligible,String ineligibleReason) {}
}
