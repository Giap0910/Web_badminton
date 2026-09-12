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
    private Long id;
    private Long userId;
    private String customerName;
    private String shippingPhone;
    private String shippingAddress;
    private BigDecimal totalAmount;
    private String voucherCode;
    private BigDecimal discountAmount;
    private String note;
    private String status;
    private String paymentMethod;
    private Long payosOrderCode;
    private LocalDateTime expiresAt;
    private Long timeRemainingSeconds;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    // VietQR / PayOS Payment Link details
    private String checkoutUrl;
    private String qrCode;
    private String accountNo;
    private String accountName;
    private String bin;
}
