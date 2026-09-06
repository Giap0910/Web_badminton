package com.sports.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {
    private Long id;
    private String name;
    private String brand;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer stock;
    private Integer reservedStock;
    private String imageUrl;
    private String description;
    private String weightGrip;
    private String stiffness;
    private String balancePoint;
    private String maxTension;
    private String playStyle;
    private Long categoryId;
    private String categoryName;
    private Double averageRating;
    private Integer reviewCount;
}
