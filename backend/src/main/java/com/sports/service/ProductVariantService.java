package com.sports.service;

import com.sports.entity.*;
import com.sports.dto.*;
import com.sports.exception.*;
import com.sports.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class ProductVariantService {
    private final ProductRepository products;
    private final ProductVariantRepository variants;

    public static void initialize(Product product, ProductDto dto) {
        List<ProductVariantDto> requested=dto.getVariants();
        if (requested == null || requested.isEmpty()) requested=defaultVariants(product);
        int index=0;
        Set<String> unique=new HashSet<>();
        for (var input : requested) {
            if (input.getStock()==null || input.getStock()<0 || input.getStock()>1000000 || input.getId()!=null)
                throw new BadRequestException("Tồn kho hoặc ID biến thể không hợp lệ");
            String key=Objects.toString(input.getColor(),"")+"|"+Objects.toString(input.getSize(),"")+"|"+Objects.toString(input.getWeightGrip(),"")+"|"+Objects.toString(input.getPackaging(),"");
            if (!unique.add(key)) throw new BadRequestException("Biến thể bị trùng");
            validateSize(product,input);
            product.getVariants().add(ProductVariant.builder().product(product).sku(product.getSku()+String.format("-V%03d",++index))
                    .color(input.getColor()).size(input.getSize()).weightGrip(input.getWeightGrip()).packaging(input.getPackaging())
                    .stock(input.getStock()).reservedStock(0).active(true).legacy(false).build());
        }
        refreshTotals(product);
    }

    private static void validateSize(Product product,ProductVariantDto input) {
        if (product.getCategory()==null) return;
        if (product.getCategory().getId()==2 && (input.getSize()==null || !input.getSize().matches("(?:3[5-9]|4[0-2])(?:\\.5)?")
                || Double.parseDouble(input.getSize())>42)) throw new BadRequestException("Size giày chỉ từ 35 đến 42");
        if (product.getCategory().getId()==3 && (input.getSize()==null || input.getSize().isBlank())) throw new BadRequestException("Quần áo cần kích cỡ");
        if (product.getCategory().getId()==1 && (input.getWeightGrip()==null || input.getWeightGrip().isBlank())) throw new BadRequestException("Vợt cần trọng lượng/cỡ cán");
    }

    private static List<ProductVariantDto> defaultVariants(Product product) {
        List<String> sizes=new ArrayList<>();
        if (product.getAvailableSizes()!=null) try {
            var node=new com.fasterxml.jackson.databind.ObjectMapper().readTree(product.getAvailableSizes());
            node.forEach(size -> sizes.add(size.asText()));
        } catch(Exception ex) { throw new BadRequestException("Danh sách kích cỡ không hợp lệ"); }
        if (sizes.isEmpty()) sizes.add(null);
        List<ProductVariantDto> result=new ArrayList<>();
        int total=product.getStock();
        for (int index=0;index<sizes.size();index++) result.add(ProductVariantDto.builder().size(sizes.get(index))
                .color(product.getColorName()).weightGrip(product.getWeightGrip()).packaging(product.getQuantityPerPack())
                .stock(total/sizes.size()+(index<total%sizes.size()?1:0)).build());
        return result;
    }

    public static List<ProductVariantDto> describe(Product product) {
        if (product.getVariants() == null) return List.of();
        return product.getVariants().stream().map(v -> ProductVariantDto.builder().id(v.getId()).sku(v.getSku())
                .color(v.getColor()).size(v.getSize()).weightGrip(v.getWeightGrip()).packaging(v.getPackaging())
                .stock(v.getStock()).reservedStock(v.getReservedStock()).active(v.getActive()).legacy(v.getLegacy())
                .inStock(Boolean.TRUE.equals(v.getActive()) && v.getStock() > 0).build()).toList();
    }

    public static ProductVariant select(Product product, OrderItemRequest request) {
        List<ProductVariant> all = product.getVariants();
        if (all == null || all.isEmpty()) return null;
        var candidates = all.stream().filter(v -> Boolean.TRUE.equals(v.getActive()) && !Boolean.TRUE.equals(v.getLegacy()))
                .filter(v -> request.getVariantId() == null || v.getId().equals(request.getVariantId()))
                .filter(v -> matches(request.getSelectedSize(), v.getSize()) && matches(request.getSelectedColor(), v.getColor())
                        && matches(request.getSelectedWeight(), v.getWeightGrip())).toList();
        if (candidates.size() != 1) throw new BadRequestException("Vui lòng chọn đúng màu, kích cỡ hoặc trọng lượng của sản phẩm");
        return candidates.get(0);
    }
    private static boolean matches(String requested, String actual) {
        return requested == null || requested.isBlank() || requested.trim().equals(actual);
    }
    public static void reserve(ProductVariant variant, int quantity) {
        if (variant == null) return;
        if (variant.getStock() < quantity) throw new InsufficientStockException("Biến thể đã chọn không đủ hàng");
        variant.setStock(variant.getStock() - quantity);
        variant.setReservedStock(Math.addExact(variant.getReservedStock(), quantity));
    }
    public static void settle(ProductVariant variant, int quantity, boolean restore) {
        if (variant == null) return;
        if (variant.getReservedStock() < quantity) throw new BadRequestException("Tồn giữ chỗ của biến thể không khớp");
        variant.setReservedStock(variant.getReservedStock() - quantity);
        if (restore) variant.setStock(Math.addExact(variant.getStock(), quantity));
    }
    public static void refreshTotals(Product product) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) return;
        product.setStock(product.getVariants().stream().filter(v -> Boolean.TRUE.equals(v.getActive()))
                .mapToInt(ProductVariant::getStock).reduce(0, Math::addExact));
        product.setReservedStock(product.getVariants().stream().mapToInt(ProductVariant::getReservedStock).reduce(0, Math::addExact));
    }
    @Transactional
    public ProductVariantDto update(Long productId, Long variantId, ProductVariantDto dto) {
        Product product = products.findByIdForUpdate(productId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        var variant = product.getVariants().stream().filter(v -> v.getId().equals(variantId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể của sản phẩm"));
        if (dto.getStock() == null || dto.getStock() < 0 || dto.getStock() > 1000000
                || !Objects.equals(dto.getExpectedStock(),variant.getStock()))
            throw new BadRequestException("Tồn kho đã thay đổi. Hãy tải lại trước khi lưu");
        if (Boolean.FALSE.equals(dto.getActive()) && variant.getReservedStock() > 0)
            throw new BadRequestException("Biến thể đang giữ hàng cho đơn chưa hoàn tất");
        variant.setStock(dto.getStock());
        if (dto.getActive() != null && !Boolean.TRUE.equals(variant.getLegacy())) variant.setActive(dto.getActive());
        refreshTotals(product);
        products.save(product);
        return describe(product).stream().filter(v -> v.getId().equals(variantId)).findFirst().orElseThrow();
    }
}
