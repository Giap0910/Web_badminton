package com.sports.controller;

import com.sports.dto.ProductDto;
import com.sports.dto.ProductCatalogFilters;
import com.sports.dto.ProductVisibilityRequest;
import com.sports.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<?> getProducts(
            @RequestParam(required = false) String keyword, @RequestParam(required = false) String brand,
            @RequestParam(required = false) String weightGrip, @RequestParam(required = false) String balancePoint,
            @RequestParam(required = false) String stiffness, @RequestParam(required = false) String playStyle,
            @RequestParam(required = false) BigDecimal minPrice, @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "shop") String catalogScope,
            @Valid @ModelAttribute ProductCatalogFilters filters
    ) {
        if (page != null && size != null) {
            return ResponseEntity.ok(productService.getProductsPaged(
                    keyword, brand, weightGrip, balancePoint, stiffness, playStyle, minPrice, maxPrice, categoryId,
                    page, size, sortBy, sortDir, catalogScope, filters
            ));
        }
        return ResponseEntity.ok(productService.getProducts(
                keyword, brand, weightGrip, balancePoint, stiffness, playStyle, minPrice, maxPrice, categoryId, catalogScope, filters
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProductById(@PathVariable Long id,
            @RequestParam(defaultValue = "shop") String catalogScope) {
        return ResponseEntity.ok(productService.getProductById(id, catalogScope));
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<List<String>> getProductImages(@PathVariable Long id,
            @RequestParam(defaultValue = "shop") String catalogScope) {
        return ResponseEntity.ok(productService.getProductImages(id, catalogScope));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ProductDto> createProduct(@Valid @RequestBody ProductDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ProductDto> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDto dto) {
        return ResponseEntity.ok(productService.updateProduct(id, dto));
    }

    @PatchMapping("/{id}/visibility")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ProductDto> updateVisibility(@PathVariable Long id,
            @Valid @RequestBody ProductVisibilityRequest request) {
        return ResponseEntity.ok(productService.updateVisibility(id, request.catalogVisible()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
