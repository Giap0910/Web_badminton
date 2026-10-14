package com.sports.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    @Builder.Default
    private String paymentMode = "REAL";
    private Long id;
    private Long userId;
    private String customerName;
    private String shippingPhone;
    private String shippingAddress;
    private BigDecimal totalAmount;
    private BigDecimal shippingFee;
    private String voucherCode;
    private BigDecimal discountAmount;
    private Integer pointsUsed;
    private BigDecimal pointsDiscount;
    private String note;
    private String status;
    private String paymentMethod;
    private Long payosOrderCode;
    private LocalDateTime expiresAt;
    private Long timeRemainingSeconds;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private Boolean cashCollected;
    private LocalDateTime cashCollectedAt;
    private Long cashCollectedBy;
    private List<OrderItemResponse> items;

    // VietQR / PayOS Payment Link details
    private String checkoutUrl;
    private String qrCode;
    private String qrCodeUrl;
    private String accountNo;
    private String accountName;
    private String bin;
}
