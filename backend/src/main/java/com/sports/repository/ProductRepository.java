package com.sports.repository;

import com.sports.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id=(SELECT v.product.id FROM ProductVariant v WHERE v.id=:id)")
    Optional<Product> findByVariantIdForUpdate(@Param("id") Long id);

    List<Product> findByCategoryId(Long categoryId);

    @Query("SELECT COUNT(i) FROM OrderItem i WHERE i.product.id = :id")
    long countOrderReferences(@Param("id") Long id);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.product.id = :id")
    long countReviewReferences(@Param("id") Long id);

    @Query("SELECT COUNT(i) FROM OrderItem i WHERE i.product.id=:id AND i.order.status IN "
            + "(com.sports.entity.OrderStatus.PENDING,com.sports.entity.OrderStatus.PAID,com.sports.entity.OrderStatus.SHIPPING)")
    long countActiveOrderReferences(@Param("id") Long id);
    @Query("SELECT COUNT(DISTINCT r.id) FROM ReturnRequest r LEFT JOIN r.orderItem line LEFT JOIN line.product product "
            + "JOIN r.order.items i WHERE (product.id=:id OR (line IS NULL AND i.product.id=:id)) AND r.status IN "
            + "(com.sports.entity.ReturnStatus.PENDING,com.sports.entity.ReturnStatus.APPROVED)")
    long countActiveReturns(@Param("id") Long id);
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE OrderItem i SET i.product=null,i.variant=null WHERE i.product.id=:id")
    int detachOrderHistory(@Param("id") Long id);
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Review r SET r.product=null WHERE r.product.id=:id")
    int detachReviewHistory(@Param("id") Long id);

    List<Product> findByBrandIgnoreCase(String brand);

    @Query("SELECT p FROM Product p WHERE p.stock > 0 ORDER BY p.id DESC")
    List<Product> findAvailableProducts();

    @Query("SELECT p FROM Product p WHERE p.stock > 0 AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.playStyle) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.balancePoint) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Product> searchInStockForAi(@Param("keyword") String keyword);
}
