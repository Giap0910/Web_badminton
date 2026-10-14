package com.sports.repository;
import com.sports.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    void deleteByProductId(Long productId);
    boolean existsBySkuIgnoreCase(String sku);
}
