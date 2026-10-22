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

    private record EditingFixture(com.sports.entity.Product product,com.sports.repository.ProductRepository products,ProductService service) {}

    private EditingFixture editingProduct(long category) {
        var products=org.mockito.Mockito.mock(com.sports.repository.ProductRepository.class);
        var product=com.sports.entity.Product.builder().id(7L).sku("HG-SHOE-007").name("Sản phẩm kiểm thử").brand("Yonex")
                .stock(20).reservedStock(0).price(java.math.BigDecimal.valueOf(100000))
                .category(com.sports.entity.Category.builder().id(category).build()).build();
        product.getVariants().add(com.sports.entity.ProductVariant.builder().id(1L).product(product).sku("HG-SHOE-007-V001")
                .color("Trắng").size(category==2 ? "40" : null).weightGrip(category==1 ? "4U-G5" : null)
                .packaging(category==5 ? "10 m" : null).stock(20).build());
        ProductVariantService.refreshCatalog(product);
        org.mockito.Mockito.when(products.findByIdForUpdate(7L)).thenReturn(java.util.Optional.of(product));
        org.mockito.Mockito.when(products.save(org.mockito.Mockito.any())).thenAnswer(call->call.getArgument(0));
        var service=new ProductService(products,org.mockito.Mockito.mock(com.sports.repository.CategoryRepository.class),
                org.mockito.Mockito.mock(ReviewService.class),org.mockito.Mockito.mock(com.sports.repository.ProductImageRepository.class));
        return new EditingFixture(product,products,service);
    }

    @Test void parentCannotReclassifyOrReplaceItsVariantChoices() {
        var fixture=editingProduct(2);
        var request=com.sports.dto.ProductDto.builder().price(fixture.product().getPrice()).categoryId(3L).build();
        assertThrows(com.sports.exception.BadRequestException.class,()->fixture.service().updateProduct(7L,request));
        request.setCategoryId(null);request.setAvailableSizes("[\"41\"]");
        assertThrows(com.sports.exception.BadRequestException.class,()->fixture.service().updateProduct(7L,request));
        request.setAvailableSizes(null);request.setColorName("Đỏ");
        assertThrows(com.sports.exception.BadRequestException.class,()->fixture.service().updateProduct(7L,request));
        request.setColorName(null);request.setVariants(java.util.List.of());
        assertThrows(com.sports.exception.BadRequestException.class,()->fixture.service().updateProduct(7L,request));
        assertEquals(2L,fixture.product().getCategory().getId());assertEquals("[\"40\"]",fixture.product().getAvailableSizes());
        assertEquals("Trắng",fixture.product().getColorName());
        org.mockito.Mockito.verify(fixture.products(),org.mockito.Mockito.never()).save(org.mockito.Mockito.any());
    }

    @Test void racketWeightAndAccessoryPackagingCannotDivergeFromTheirCombinations() {
        var racket=editingProduct(1);var accessory=editingProduct(5);
        var changedWeight=com.sports.dto.ProductDto.builder().price(racket.product().getPrice()).weightGrip("3U-G5").build();
        var changedPack=com.sports.dto.ProductDto.builder().price(accessory.product().getPrice()).quantityPerPack("200 m").build();

        assertThrows(com.sports.exception.BadRequestException.class,()->racket.service().updateProduct(7L,changedWeight));
        assertThrows(com.sports.exception.BadRequestException.class,()->accessory.service().updateProduct(7L,changedPack));

        assertEquals("4U-G5",racket.product().getWeightGrip());assertEquals("10 m",accessory.product().getQuantityPerPack());
    }

    @Test void independentProductDetailsAndEquivalentSizeJsonStillUpdateSuccessfully() {
        var fixture=editingProduct(2);
        var request=com.sports.dto.ProductDto.builder().name("Giày Yonex đã chỉnh").brand("Yonex")
                .price(java.math.BigDecimal.valueOf(150000)).description("Mô tả đúng mẫu giày")
                .upperMaterial("Vải lưới").availableSizes("[ \"40\" ]").build();

        var result=fixture.service().updateProduct(7L,request);

        assertEquals("Giày Yonex đã chỉnh",result.getName());assertEquals(request.getPrice(),result.getPrice());
        assertEquals("Mô tả đúng mẫu giày",result.getDescription());assertEquals("Vải lưới",result.getUpperMaterial());
        assertEquals("[\"40\"]",result.getAvailableSizes());assertEquals(20,result.getStock());
        assertEquals(1L,result.getVariants().get(0).getId());assertEquals("40",result.getVariants().get(0).getSize());
    }
    @Test void comparisonSupportsEveryCategoryAndKeepsOrder() {
        var service = org.mockito.Mockito.spy(new ProductService(null, null, null, null));
        for (long category = 1; category <= 5; category++) {
            var first = com.sports.dto.ProductDto.builder().id(1L).categoryId(category).accessoryType("day_cuoc").build();
            var second = com.sports.dto.ProductDto.builder().id(2L).categoryId(category).accessoryType("day_cuoc").build();
            org.mockito.Mockito.doReturn(first).when(service).getProductById(1L);
            org.mockito.Mockito.doReturn(second).when(service).getProductById(2L);
            var result = service.compareRackets(java.util.List.of(2L, 1L));
            assertEquals(java.util.List.of(2L, 1L), result.getRackets().stream().map(com.sports.dto.ProductDto::getId).toList());
            assertFalse(result.getComparisonAttributes().isEmpty());
            second.setCategoryId(category == 1 ? 2L : 1L);
            assertThrows(com.sports.exception.BadRequestException.class, () -> service.compareRackets(java.util.List.of(1L, 2L)));
        }
    }

    @Test void comparisonRejectsDifferentOrUnknownAccessoryTypesAndInvalidIds() {
        var service = org.mockito.Mockito.spy(new ProductService(null, null, null, null));
        var first = com.sports.dto.ProductDto.builder().id(1L).categoryId(5L).accessoryType("day_cuoc").build();
        var second = com.sports.dto.ProductDto.builder().id(2L).categoryId(5L).accessoryType("quan_can").build();
        org.mockito.Mockito.doReturn(first).when(service).getProductById(1L);
        org.mockito.Mockito.doReturn(second).when(service).getProductById(2L);
        assertThrows(com.sports.exception.BadRequestException.class, () -> service.compareRackets(java.util.List.of(1L, 2L)));
        first.setAccessoryType(null);
        assertThrows(com.sports.exception.BadRequestException.class, () -> service.compareRackets(java.util.List.of(1L)));
        for (var ids : java.util.List.of(java.util.List.<Long>of(), java.util.List.of(1L, 1L), java.util.List.of(0L), java.util.List.of(1L, 2L, 3L, 4L))) {
            assertThrows(com.sports.exception.BadRequestException.class, () -> service.compareRackets(ids));
        }
    }
}
