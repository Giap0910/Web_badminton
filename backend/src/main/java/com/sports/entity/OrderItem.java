package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;
    @Column(name = "product_id_snapshot") private Long productIdSnapshot;
    @Column(name = "product_name_snapshot", length = 200) private String productNameSnapshot;
    @Column(name = "product_sku_snapshot", length = 50) private String productSkuSnapshot;
    @Column(name = "product_brand_snapshot", length = 50) private String productBrandSnapshot;
    @Column(name = "product_image_snapshot", length = 500) private String productImageSnapshot;
    @Column(name = "category_id_snapshot") private Long categoryIdSnapshot;
    @PrePersist public void captureProduct() {
        if (product == null) return;
        if (categoryIdSnapshot == null && product.getCategory() != null) categoryIdSnapshot=product.getCategory().getId();
        if (productNameSnapshot != null) return;
        productIdSnapshot=product.getId();productNameSnapshot=product.getName();
        productSkuSnapshot=product.getSku();productBrandSnapshot=product.getBrand();productImageSnapshot=product.getImageUrl();
    }
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price; // Price at the time of purchase

    @Column(name = "selected_size", length = 50)
    private String selectedSize;

    @Column(name = "selected_color", length = 200)
    private String selectedColor;

    @Column(name = "selected_weight", length = 50)
    private String selectedWeight;

    @Column(name = "stringing_service", length = 100)
    private String stringingService;

    @Column(name = "string_tension", length = 50)
    private String stringTension;
}
