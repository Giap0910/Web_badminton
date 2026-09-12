package com.sports.dto;

import com.sports.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPaymentDto {
    private Long orderId;
    private Long payosOrderCode;
    private String customerName;
    private String shippingPhone;
    private BigDecimal amount;
    private String paymentMethod;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private String note;
}
