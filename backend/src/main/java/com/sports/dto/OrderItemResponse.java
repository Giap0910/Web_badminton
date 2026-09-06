package com.sports.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productBrand;
    private String productImageUrl;
    private String weightGrip;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal subtotal;
}
