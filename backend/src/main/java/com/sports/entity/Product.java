package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 50)
    private String brand; // Yonex, Victor, Lining, Mizuno, etc.

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 12, scale = 2)
    private BigDecimal originalPrice;

    @Column(nullable = false)
    private Integer stock; // Available stock

    @Column(name = "reserved_stock", nullable = false)
    @Builder.Default
    private Integer reservedStock = 0; // Temporarily locked stock during PENDING orders

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sku", length = 50, unique = true)
    private String sku;

    // Technical Badminton Attributes
    @Column(name = "weight_grip", length = 50)
    private String weightGrip; // 3U-G5, 4U-G5, 5U

    @Column(name = "weight_class", length = 50)
    private String weightClass; // 2U, 3U, 4U, 5U

    @Column(length = 50)
    private String stiffness; // Stiff, Medium, Flexible

    @Column(name = "balance_point", length = 50)
    private String balancePoint; // Head-Heavy (Nặng đầu), Even (Cân bằng), Head-Light (Nhẹ đầu)

    @Column(name = "max_tension", length = 50)
    private String maxTension; // e.g. 28-30 lbs

    @Column(name = "play_style", length = 100)
    private String playStyle; // Tấn công uy lực, Phản tạt toàn diện, Công thủ toàn diện, Tốc độ điều cầu

    @Column(name = "frame_material", length = 150)
    private String frameMaterial;

    @Column(name = "shaft_material", length = 150)
    private String shaftMaterial;

    // Shoes & Apparel Attributes
    @Column(name = "available_sizes", columnDefinition = "LONGTEXT")
    private String availableSizes; // JSON string e.g. ["39", "40", "41"] or ["S", "M", "L"]

    @Column(name = "sole_type", length = 100)
    private String soleType;

    @Column(name = "cushion_technology", length = 150)
    private String cushionTechnology;

    @Column(name = "upper_material", length = 150)
    private String upperMaterial;

    @Column(length = 30)
    private String gender; // Nam, Nữ, Unisex

    @Column(name = "fabric_type", length = 150)
    private String fabricType;

    // Bags Attributes
    @Column(name = "bag_type", length = 50)
    private String bagType; // balo, bao_vot_nhiet, tui_holdall

    @Column(length = 50)
    private String capacity;

    @Column(name = "racket_capacity")
    private Integer racketCapacity;

    @Column(length = 50)
    private String waterproof;

    // Accessories Attributes
    @Column(name = "accessory_type", length = 50)
    private String accessoryType;

    @Column(name = "quantity_per_pack", length = 50)
    private String quantityPerPack;

    @Column(length = 100)
    private String origin;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;
}
