package com.sports.repository;

import com.sports.entity.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filterProducts(
            String keyword,
            String brand,
            String weightGrip,
            String balancePoint,
            String stiffness,
            String playStyle,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long categoryId
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.trim().isEmpty()) {
                String searchPattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate brandMatch = cb.like(cb.lower(root.get("brand")), searchPattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), searchPattern);
                predicates.add(cb.or(nameMatch, brandMatch, descMatch));
            }

            if (brand != null && !brand.trim().isEmpty() && !brand.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("brand")), brand.trim().toLowerCase()));
            }

            if (weightGrip != null && !weightGrip.trim().isEmpty() && !weightGrip.equalsIgnoreCase("all")) {
                predicates.add(cb.like(cb.lower(root.get("weightGrip")), "%" + weightGrip.trim().toLowerCase() + "%"));
            }

            if (balancePoint != null && !balancePoint.trim().isEmpty() && !balancePoint.equalsIgnoreCase("all")) {
                predicates.add(cb.like(cb.lower(root.get("balancePoint")), "%" + balancePoint.trim().toLowerCase() + "%"));
            }

            if (stiffness != null && !stiffness.trim().isEmpty() && !stiffness.equalsIgnoreCase("all")) {
                predicates.add(cb.like(cb.lower(root.get("stiffness")), "%" + stiffness.trim().toLowerCase() + "%"));
            }

            if (playStyle != null && !playStyle.trim().isEmpty() && !playStyle.equalsIgnoreCase("all")) {
                predicates.add(cb.like(cb.lower(root.get("playStyle")), "%" + playStyle.trim().toLowerCase() + "%"));
            }

            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
