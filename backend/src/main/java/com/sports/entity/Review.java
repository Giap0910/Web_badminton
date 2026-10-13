package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
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
    @PrePersist public void captureProduct() {
        if (product == null || productNameSnapshot != null) return;
        productIdSnapshot=product.getId();productNameSnapshot=product.getName();
        productBrandSnapshot=product.getBrand();productImageSnapshot=product.getImageUrl();
    }

    @Column(nullable = false)
    private Integer rating; // 1 to 5 stars

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
