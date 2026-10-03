package com.sports.dto;

import lombok.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {
    private Long id;
    @NotBlank @Size(max = 200)
    private String name;
    @NotBlank @Size(max = 50)
    private String brand;
    @NotNull @DecimalMin(value = "0", inclusive = false)
    @DecimalMax("9999999999") @Digits(integer = 10, fraction = 0)
    private BigDecimal price;
    @DecimalMin("0") @DecimalMax("9999999999") @Digits(integer = 10, fraction = 0)
    private BigDecimal originalPrice;
    @Min(0)
    private Integer stock;
    private Integer expectedStock;
    private Integer reservedStock;
    @Size(max = 500)
    private String imageUrl;
    private String description;
    @Size(max = 50)
    private String sku;
    private String weightGrip;
    private String weightClass;
    private String stiffness;
    private String balancePoint;
    @Size(max = 50)
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
    @Positive
    private Long categoryId;
    private String categoryName;
    private Double averageRating;
    private Integer reviewCount;
    private java.util.List<String> imageUrls;
}
