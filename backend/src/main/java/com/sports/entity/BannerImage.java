package com.sports.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "banner_images")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BannerImage {
    @Id @Column(name = "slot_position")
    private Integer position;
    @Column(name = "image_url", length = 500)
    private String imageUrl;
}
