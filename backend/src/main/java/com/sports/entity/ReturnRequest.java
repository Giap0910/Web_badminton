package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_item_id")
    private OrderItem orderItem;
    @Column(nullable = false) @Builder.Default private Integer quantity=1;
    @Column(name = "serial_number",length = 100) private String serialNumber;
    @Column(name = "original_variant_id") private Long originalVariantId;
    @Column(name = "evidence_key",length = 100) private String evidenceKey;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @Column(name = "replacement_variant_id") private Long replacementVariantId;
    @Column(name = "replacement_product_id") private Long replacementProductId;
    @Column(name = "replacement_sku",length = 100) private String replacementSku;
    @Column(name = "replacement_product_name",length = 200) private String replacementProductName;
    @Column(name = "replacement_color",length = 200) private String replacementColor;
    @Column(name = "replacement_size",length = 50) private String replacementSize;
    @Column(name = "replacement_weight_grip",length = 50) private String replacementWeightGrip;
    @Column(name = "replacement_packaging",length = 100) private String replacementPackaging;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.PENDING;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
