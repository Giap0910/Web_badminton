package com.sports.repository;

import com.sports.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Long productId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "product")
    java.util.Optional<ProductImage> findFirstByProductIdAndImageUrlAndRightsApprovedTrueAndModelVerifiedTrue(
            Long productId, String imageUrl);
    void deleteByProductId(Long productId);
}
