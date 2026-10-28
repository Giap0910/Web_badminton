package com.sports.repository;

import com.sports.entity.Product;
import com.sports.entity.ProductBrand;
import com.sports.dto.ProductCatalogFilters;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> shopCatalog() {
        return (root, query, cb) -> cb.and(cb.isTrue(root.get("catalogVisible")),
                cb.lower(cb.trim(root.get("brand"))).in(ProductBrand.databaseNames()));
    }

    public static Specification<Product> filterProducts(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            addKeyword(root, cb, predicates, keyword);
            addBrand(root, cb, predicates, brand);
            addContains(root, cb, predicates, "weightGrip", weightGrip);
            addContains(root, cb, predicates, "balancePoint", balancePoint);
            addContains(root, cb, predicates, "stiffness", stiffness);
            addContains(root, cb, predicates, "playStyle", playStyle);
            if (minPrice != null) predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            if (maxPrice != null) predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            if (categoryId != null) predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addKeyword(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String keyword) {
        if (keyword == null || keyword.isBlank()) return;
        String pattern = "%" + searchText(keyword).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var name = cb.function("replace", String.class, cb.lower(root.get("name")), cb.literal("đ"), cb.literal("d"));
        name = cb.function("replace", String.class, name, cb.literal("li-ning"), cb.literal("lining"));
        name = cb.function("replace", String.class, name, cb.literal("li ning"), cb.literal("lining"));
        predicates.add(cb.like(name, pattern, '!'));
    }

    public static String searchText(String value) {
        String lowercase = value == null ? "" : value.trim().toLowerCase(java.util.Locale.ROOT);
        return java.text.Normalizer.normalize(lowercase, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd').replace("li-ning", "lining").replace("li ning", "lining");
    }

    private static void addBrand(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String brand) {
        if (!isFilterValue(brand)) return;
        String canonical = ProductBrand.canonicalName(brand);
        predicates.add("Li-Ning".equals(canonical)
                ? cb.lower(cb.trim(root.get("brand"))).in("lining", "li-ning")
                : cb.equal(cb.lower(cb.trim(root.get("brand"))), canonical.toLowerCase(java.util.Locale.ROOT)));
    }

    private static void addContains(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String field, String value) {
        if (isFilterValue(value)) {
            predicates.add(cb.like(cb.lower(root.get(field)), "%" + value.trim().toLowerCase(java.util.Locale.ROOT) + "%"));
        }
    }

    private static boolean isFilterValue(String value) {
        return value != null && !value.isBlank() && !value.equalsIgnoreCase("all");
    }

    public static Specification<Product> catalogAttributes(ProductCatalogFilters filters) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (filters == null) return cb.conjunction();
            addSize(root, cb, predicates, filters.getProductSize());
            addGender(root, cb, predicates, filters.getGender());
            addExact(root, cb, predicates, "bagType", filters.getBagType());
            addExact(root, cb, predicates, "accessoryType", filters.getAccessoryType());
            if (filters.getRacketCapacity() != null)
                predicates.add(cb.equal(root.get("racketCapacity"), filters.getRacketCapacity()));
            if (Boolean.TRUE.equals(filters.getSale())) {
                predicates.add(cb.greaterThan(root.get("price"), BigDecimal.ZERO));
                predicates.add(cb.greaterThan(root.get("originalPrice"), root.get("price")));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addSize(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String size) {
        if (!isFilterValue(size)) return;
        var sizes = cb.<String>selectCase()
                .when(cb.equal(cb.function("JSON_VALID", Integer.class, root.get("availableSizes")), 1),
                        root.<String>get("availableSizes")).otherwise("[]");
        var quoted = cb.function("JSON_QUOTE", String.class, cb.literal(size.trim()));
        predicates.add(cb.equal(cb.function("JSON_CONTAINS", Integer.class, sizes, quoted), 1));
    }

    private static void addGender(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String gender) {
        if (!isFilterValue(gender)) return;
        String value = gender.trim().toLowerCase(java.util.Locale.ROOT);
        var field = cb.lower(cb.trim(root.get("gender")));
        predicates.add(java.util.Set.of("nam", "nữ").contains(value)
                ? field.in(value, "unisex") : cb.equal(field, value));
    }

    private static void addExact(jakarta.persistence.criteria.Root<Product> root,
            jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates, String field, String value) {
        if (isFilterValue(value)) predicates.add(cb.equal(cb.lower(cb.trim(root.get(field))),
                value.trim().toLowerCase(java.util.Locale.ROOT)));
    }
}
