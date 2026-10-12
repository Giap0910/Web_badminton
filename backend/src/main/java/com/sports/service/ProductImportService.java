package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.entity.ProductBrand;
import com.sports.exception.BadRequestException;
import com.sports.repository.*;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.MessageDigest;
import java.util.*;

@Service @RequiredArgsConstructor
public class ProductImportService {
    private final ProductExcelService excel;
    private final ProductService products;
    private final ProductRepository repository;
    private final CategoryRepository categories;
    private final Validator validator;
    public record Result(String sha256, int total, boolean valid, List<ProductExcelService.Input> rows, List<Long> importedIds) {}

    @Transactional(readOnly = true)
    public Result preview(byte[] bytes) {
        var rows = excel.read(bytes);
        var existing = repository.findAll().stream().map(p -> p.getSku() == null ? "" : p.getSku().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        Set<String> assigned = new HashSet<>();
        var checked = rows.stream().map(row -> validate(row, existing, assigned)).toList();
        return new Result(hash(bytes), checked.size(), checked.stream().allMatch(row -> row.errors().isEmpty()), checked, List.of());
    }

    @Transactional
    public Result commit(byte[] bytes, String expectedHash) {
        Result preview = preview(bytes);
        if (!preview.sha256().equals(expectedHash)) throw new BadRequestException("File đã thay đổi; cần xem trước lại");
        if (!preview.valid()) throw new BadRequestException("File có dòng lỗi; sửa lỗi và xem trước lại trước khi nhập");
        List<Long> ids = new ArrayList<>();
        for (var row : preview.rows()) {
            Long id = products.createProduct(row.product()).getId();
            products.updateVisibility(id, Boolean.TRUE.equals(row.product().getCatalogVisible())); ids.add(id);
        }
        repository.flush();
        return new Result(preview.sha256(), preview.total(), true, preview.rows(), ids);
    }

    private ProductExcelService.Input validate(ProductExcelService.Input row, Set<String> existing, Set<String> assigned) {
        List<String> errors = new ArrayList<>(row.errors());
        ProductDto product = row.product();
        if (product == null) return new ProductExcelService.Input(row.sheet(), row.row(), null, errors);
        validator.validate(product).forEach(error -> errors.add(error.getPropertyPath() + ": " + error.getMessage()));
        if (product.getSku() == null || product.getSku().isBlank()) errors.add("sku: phải có mã nội bộ để chống nhập trùng");
        else if (existing.contains(product.getSku().toLowerCase(Locale.ROOT)) || !assigned.add(product.getSku().toLowerCase(Locale.ROOT))) errors.add("sku: đã tồn tại hoặc trùng trong file");
        if (!ProductBrand.isSupported(product.getBrand())) errors.add("brand: chỉ dùng sáu thương hiệu của cửa hàng");
        if (product.getCategoryId() == null || !categories.existsById(product.getCategoryId())) errors.add("categoryId: không có trong Database");
        if (product.getPrice() == null || product.getPrice().signum() <= 0) errors.add("price: phải là giá bán dương");
        if (product.getOriginalPrice() != null && product.getPrice() != null && product.getOriginalPrice().compareTo(product.getPrice()) < 0) errors.add("originalPrice: không được nhỏ hơn giá bán");
        if (product.getStock() == null || product.getStock() < 0) errors.add("stock: phải có tồn không âm");
        validateSpecifications(product, errors);
        return new ProductExcelService.Input(row.sheet(), row.row(), product, errors);
    }

    private void validateSpecifications(ProductDto product, List<String> errors) {
        List<String> required = switch (product.getCategoryId() == null ? 0 : product.getCategoryId().intValue()) {
            case 1 -> List.of("weightGrip", "weightClass", "balancePoint", "stiffness", "maxTension", "frameMaterial", "shaftMaterial");
            case 2 -> List.of("availableSizes", "soleType", "cushionTechnology", "upperMaterial");
            case 3 -> List.of("availableSizes", "gender", "fabricType");
            case 4 -> List.of("bagType", "capacity", "racketCapacity", "waterproof");
            case 5 -> List.of("accessoryType", "quantityPerPack");
            default -> List.of();
        };
        var bean = new org.springframework.beans.BeanWrapperImpl(product);
        for (String key : required) {
            Object value = bean.getPropertyValue(key);
            if (value == null || value.toString().isBlank() || value.toString().equals("[]")) errors.add(key + ": thiếu thông số theo danh mục");
        }
        if (product.getAvailableSizes() != null) validateSizes(product.getAvailableSizes(), errors);
    }

    private void validateSizes(String sizes, List<String> errors) {
        try {
            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(sizes);
            if (!node.isArray() || node.isEmpty()) throw new IllegalArgumentException();
            for (var size : node) if (!size.isTextual() || size.textValue().isBlank() || size.textValue().length() > 50) throw new IllegalArgumentException();
        } catch (Exception ex) { errors.add("availableSizes: phải là danh sách kích cỡ hợp lệ"); }
    }

    private String hash(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
