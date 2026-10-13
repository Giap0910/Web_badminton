package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "product_variants")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductVariant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id", nullable = false) private Product product;
    @Column(nullable = false, unique = true, length = 100) private String sku;
    @Column(length = 200) private String color;
    @Column(length = 50) private String size;
    @Column(name = "weight_grip", length = 50) private String weightGrip;
    @Column(length = 100) private String packaging;
    @Column(nullable = false) private Integer stock;
    @Column(name = "reserved_stock", nullable = false) @Builder.Default private Integer reservedStock = 0;
    @Column(nullable = false) @Builder.Default private Boolean active = true;
    @Column(nullable = false) @Builder.Default private Boolean legacy = false;
}
