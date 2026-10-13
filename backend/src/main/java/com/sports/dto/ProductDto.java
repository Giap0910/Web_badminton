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
    @NotNull @DecimalMin(value = "0", inclusive = false, message = "Giá bán phải lớn hơn 0")
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
    @Size(max = 100) private String manufacturerCode;
    @Size(max = 200) private String colorName;
    @Size(max = 100) private String edition;
    private java.time.LocalDateTime arrivedAt;
    @Size(max = 1000) private String specificationSource;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean isNew;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private java.util.List<String> benefits;
    @jakarta.validation.Valid private java.util.List<ProductVariantDto> variants;
    private Boolean inStock;
    @com.fasterxml.jackson.annotation.JsonGetter("stock")
    public Integer publicStock() { return administrator() ? stock : null; }
    @com.fasterxml.jackson.annotation.JsonGetter("reservedStock")
    public Integer publicReservedStock() { return administrator() ? reservedStock : null; }
    private boolean administrator() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
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
    private java.util.List<ProductGallerySlotDto> imageSlots;
}
