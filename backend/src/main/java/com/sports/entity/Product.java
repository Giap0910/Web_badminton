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

    // Technical Badminton Attributes
    @Column(name = "weight_grip", length = 50)
    private String weightGrip; // 3U-G5, 4U-G5, 5U

    @Column(length = 50)
    private String stiffness; // Stiff, Medium, Flexible

    @Column(name = "balance_point", length = 50)
    private String balancePoint; // Head-Heavy (Nặng đầu), Even (Cân bằng), Head-Light (Nhẹ đầu)

    @Column(name = "max_tension", length = 50)
    private String maxTension; // e.g. 28-30 lbs

    @Column(name = "play_style", length = 100)
    private String playStyle; // Tấn công uy lực, Phản tạt toàn diện, Công thủ toàn diện, Tốc độ điều cầu

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;
}
