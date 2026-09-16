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
    private String sku;
    private String weightGrip;
    private String weightClass;
    private String stiffness;
    private String balancePoint;
    private String maxTension;
    private String playStyle;
    private String frameMaterial;
    private String shaftMaterial;
    private String availableSizes;
    private String soleType;
    private String cushionTechnology;
    private String upperMaterial;
    private String gender;
    private String fabricType;
    private String bagType;
    private String capacity;
    private Integer racketCapacity;
    private String waterproof;
    private String accessoryType;
    private String quantityPerPack;
    private String origin;
    private Long categoryId;
    private String categoryName;
    private Double averageRating;
    private Integer reviewCount;
    private java.util.List<String> imageUrls;
}
