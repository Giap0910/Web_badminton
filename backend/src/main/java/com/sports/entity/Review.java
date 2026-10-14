package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(name = "uk_reviews_user_product_snapshot",
        columnNames = {"user_id", "product_id_snapshot"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;
    @Column(name = "product_id_snapshot") private Long productIdSnapshot;
    @Column(name = "product_name_snapshot", length = 200) private String productNameSnapshot;
    @Column(name = "product_brand_snapshot", length = 50) private String productBrandSnapshot;
    @Column(name = "product_image_snapshot", length = 500) private String productImageSnapshot;
    @Column(name = "product_sku_snapshot", length = 50) private String productSkuSnapshot;
    @Column(name = "order_id_snapshot") private Long orderIdSnapshot;
    @Column(name = "order_item_id_snapshot") private Long orderItemIdSnapshot;
    @Column(name = "selected_size_snapshot", length = 50) private String selectedSizeSnapshot;
    @Column(name = "selected_color_snapshot", length = 200) private String selectedColorSnapshot;
    @Column(name = "selected_weight_snapshot", length = 50) private String selectedWeightSnapshot;
    @Builder.Default @Column(name = "is_visible", nullable = false) private Boolean visible = true;
    @Builder.Default @Column(name = "verified_purchase", nullable = false) private Boolean verifiedPurchase = false;
    @Column(name = "official_reply", length = 2000) private String officialReply;
    @Column(name = "reply_updated_at") private LocalDateTime replyUpdatedAt;
    @PrePersist public void captureProduct() {
        if (product == null || productNameSnapshot != null) return;
        productIdSnapshot=product.getId();productNameSnapshot=product.getName();
        productBrandSnapshot=product.getBrand();productImageSnapshot=product.getImageUrl();
        productSkuSnapshot=product.getSku();
    }

    @Column(nullable = false)
    private Integer rating; // 1 to 5 stars

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
