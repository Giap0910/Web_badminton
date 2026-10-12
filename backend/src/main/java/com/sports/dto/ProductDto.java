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
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean catalogVisible;
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
    @Size(max = 50) private String weightGrip;
    @Size(max = 50) private String weightClass;
    @Size(max = 50) private String stiffness;
    @Size(max = 50) private String balancePoint;
    @Size(max = 50)
    private String maxTension;
    @Size(max = 100) private String playStyle;
    @Size(max = 150) private String frameMaterial;
    @Size(max = 150) private String shaftMaterial;
    private String availableSizes;
    @Size(max = 100) private String soleType;
    @Size(max = 150) private String cushionTechnology;
    @Size(max = 150) private String upperMaterial;
    @Size(max = 30) private String gender;
    @Size(max = 150) private String fabricType;
    @Size(max = 50) private String bagType;
    @Size(max = 50) private String capacity;
    @Min(0) private Integer racketCapacity;
    @Size(max = 50) private String waterproof;
    @Size(max = 50) private String accessoryType;
    @Size(max = 50) private String quantityPerPack;
    @Size(max = 100) private String origin;
    @Positive
    private Long categoryId;
    private String categoryName;
    private Double averageRating;
    private Integer reviewCount;
    private java.util.List<String> imageUrls;
}
