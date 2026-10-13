package com.sports.service;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class ProductPresentationTest {
    @Test void newBadgeExpiresAtFourteenDaysAndRejectsFutureDates() {
        var now = LocalDateTime.of(2026, 10, 13, 12, 0);
        assertTrue(ProductService.recentlyArrived(now.minusDays(13), now));
        assertFalse(ProductService.recentlyArrived(now.minusDays(14), now));
        assertFalse(ProductService.recentlyArrived(now.plusMinutes(1), now));
        assertFalse(ProductService.recentlyArrived(null, now));
    }
    @Test void benefitsRespectCategoryPolicy() {
        assertEquals(4, ProductService.benefits(1L).size());
        for (long id = 2; id <= 4; id++) {
            assertEquals(2, ProductService.benefits(id).size());
            assertFalse(ProductService.benefits(id).get(0).contains("quấn cán"));
        }
        assertTrue(ProductService.benefits(5L).isEmpty());
        assertTrue(ProductService.benefits(null).isEmpty());
    }

    @Test void editingLegacySkuKeepsHgPrefixAndOriginalAlias() {
        var products = org.mockito.Mockito.mock(com.sports.repository.ProductRepository.class);
        var images = org.mockito.Mockito.mock(com.sports.repository.ProductImageRepository.class);
        var product = com.sports.entity.Product.builder().id(99L).sku("HG-RACKET-099").legacySku("ORIGINAL-099")
                .name("Vợt kiểm thử").brand("Yonex").stock(0).reservedStock(0)
                .price(java.math.BigDecimal.valueOf(100000))
                .category(com.sports.entity.Category.builder().id(1L).build()).build();
        org.mockito.Mockito.when(products.findByIdForUpdate(99L)).thenReturn(java.util.Optional.of(product));
        org.mockito.Mockito.when(products.save(org.mockito.Mockito.any())).thenReturn(product);
        var service = new ProductService(products, org.mockito.Mockito.mock(com.sports.repository.CategoryRepository.class),
                org.mockito.Mockito.mock(ReviewService.class), images);
        var request = com.sports.dto.ProductDto.builder().name(product.getName()).brand(product.getBrand())
                .price(product.getPrice()).sku("NEW-RANDOM-CODE").build();
        assertEquals("HG-RACKET-099", service.updateProduct(99L, request).getSku());
        assertEquals("ORIGINAL-099", product.getLegacySku());
    }
}
