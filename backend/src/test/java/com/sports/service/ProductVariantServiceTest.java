package com.sports.service;

import com.sports.entity.*;
import com.sports.dto.*;
import com.sports.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import com.sports.repository.ProductRepository;
import com.sports.repository.ProductVariantRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductVariantServiceTest {
    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }
    private ProductVariant variant(long id, String size, int stock) {
        return ProductVariant.builder().id(id).sku("HG-SHOE-001-V"+id).size(size).color("Trắng / Đen")
                .stock(stock).reservedStock(0).build();
    }
    @Test void selectionsMustBelongToProductAndMatchItsAttributes() {
        Product product=Product.builder().variants(List.of(variant(1,"40",20),variant(2,"41",20))).build();
        var request=OrderItemRequest.builder().variantId(1L).selectedSize("40").build();
        assertEquals(1L,ProductVariantService.select(product,request).getId());
        request.setSelectedSize("41");
        assertThrows(BadRequestException.class,()->ProductVariantService.select(product,request));
        request.setSelectedSize(null);request.setVariantId(99L);
        assertThrows(BadRequestException.class,()->ProductVariantService.select(product,request));
        request.setVariantId(null);
        assertThrows(BadRequestException.class,()->ProductVariantService.select(product,request));
    }
    @Test void buyingLastSizeDisablesOnlyThatSizeAndCancellationRestoresIt() {
        var small=variant(1,"40",20);var large=variant(2,"41",20);
        Product product=Product.builder().variants(List.of(small,large)).build();
        ProductVariantService.reserve(small,20);ProductVariantService.refreshTotals(product);
        assertEquals(20,product.getStock());assertEquals(20,product.getReservedStock());
        assertFalse(ProductVariantService.describe(product).get(0).getInStock());
        assertTrue(ProductVariantService.describe(product).get(1).getInStock());
        assertThrows(InsufficientStockException.class,()->ProductVariantService.reserve(small,1));
        ProductVariantService.settle(small,20,true);ProductVariantService.refreshTotals(product);
        assertEquals(40,product.getStock());assertEquals(0,product.getReservedStock());
        assertThrows(BadRequestException.class,()->ProductVariantService.settle(small,20,true));
    }
    @Test void paidStockIsConsumedOnceAndLegacyStockNeverEnablesSale() {
        var active=variant(1,"40",20);var old=variant(2,"44",8);
        old.setActive(false);old.setLegacy(true);old.setReservedStock(2);
        Product product=Product.builder().variants(List.of(active,old)).build();
        ProductVariantService.reserve(active,20);ProductVariantService.settle(active,20,false);
        ProductVariantService.refreshTotals(product);
        assertEquals(0,product.getStock());assertEquals(2,product.getReservedStock());
        ProductVariantService.settle(old,2,true);ProductVariantService.refreshTotals(product);
        assertEquals(0,product.getStock());assertEquals(10,old.getStock());
    }
    @Test void stockNumbersAreOnlySerializedForAdministrator() throws Exception {
        var mapper=new ObjectMapper();
        var dto=ProductDto.builder().stock(20).reservedStock(3).inStock(true).build();
        assertTrue(mapper.readTree(mapper.writeValueAsString(dto)).get("stock").isNull());
        assertEquals(20,mapper.readValue("{\"stock\":20}",ProductDto.class).getStock());
        var variant=ProductVariantService.describe(Product.builder().variants(List.of(variant(1,"40",20))).build()).get(0);
        assertTrue(mapper.readTree(mapper.writeValueAsString(variant)).get("stock").isNull());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin","",List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        assertEquals(20,mapper.readTree(mapper.writeValueAsString(dto)).get("stock").intValue());
        assertEquals(20,mapper.readTree(mapper.writeValueAsString(variant)).get("stock").intValue());
    }

    @Test void legacyCreateKeepsTotalStockWhileExplicitVariantStocksAreAggregated() {
        var product=Product.builder().id(99L).sku("HG-SHOE-099").stock(5).availableSizes("[\"40\",\"41\"]")
                .category(Category.builder().id(2L).build()).build();
        ProductVariantService.initialize(product,ProductDto.builder().stock(5).build());
        assertEquals(5,product.getStock());assertEquals(2,product.getVariants().size());
        assertEquals(3,product.getVariants().get(0).getStock());
        var explicit=Product.builder().sku("HG-SHOE-100").stock(0).category(product.getCategory()).build();
        ProductVariantService.initialize(explicit,ProductDto.builder().variants(List.of(
                ProductVariantDto.builder().size("40").stock(20).build(),ProductVariantDto.builder().size("41").stock(20).build())).build());
        assertEquals(40,explicit.getStock());
    }

    private record InventoryFixture(Product product,ProductRepository products,ProductVariantRepository variants,ProductVariantService service) {}

    private InventoryFixture inventory(long category,ProductVariant... entries) {
        var product=Product.builder().id(7L).sku("HG-SHOE-007").stock(0).reservedStock(0)
                .category(Category.builder().id(category).build()).variants(new java.util.ArrayList<>(List.of(entries))).build();
        for (var entry : entries) entry.setProduct(product);
        ProductVariantService.refreshCatalog(product);
        var products=mock(ProductRepository.class);var variants=mock(ProductVariantRepository.class);
        when(products.findByIdForUpdate(7L)).thenReturn(java.util.Optional.of(product));
        when(variants.saveAndFlush(any())).thenAnswer(call->{ var saved=(ProductVariant)call.getArgument(0);saved.setId(99L);return saved; });
        return new InventoryFixture(product,products,variants,new ProductVariantService(products,variants));
    }

    @Test void addingARealCombinationDerivesChoicesAndTotalsWithoutChangingLegacyReservations() {
        var old=variant(2,"44",8);old.setLegacy(true);old.setActive(false);old.setReservedStock(2);
        var fixture=inventory(2,variant(1,"40",20),old);
        when(fixture.variants().existsBySkuIgnoreCase("HG-SHOE-007-V003")).thenReturn(true);

        var result=fixture.service().create(7L,ProductVariantDto.builder().color(" Xanh ").size("41").stock(20).build());

        assertEquals(99L,result.getId());assertEquals("HG-SHOE-007-V004",result.getSku());assertEquals("Xanh",result.getColor());
        assertEquals(40,fixture.product().getStock());assertEquals(2,fixture.product().getReservedStock());
        assertEquals("[\"40\",\"41\"]",fixture.product().getAvailableSizes());
        assertEquals("Trắng / Đen, Xanh",fixture.product().getColorName());
        assertEquals(8,old.getStock());assertEquals(2,old.getReservedStock());assertFalse(old.getActive());
        verify(fixture.products()).findByIdForUpdate(7L);verify(fixture.products()).saveAndFlush(fixture.product());
    }

    @Test void duplicateCombinationIncludesInactiveVariantsAndNormalizesCaseAndWhitespace() {
        var existing=variant(1,"40",20);existing.setActive(false);
        var fixture=inventory(2,existing);

        var error=assertThrows(BadRequestException.class,()->fixture.service().create(7L,
                ProductVariantDto.builder().color(" trắng / đen ").size(" 40 ").stock(20).build()));

        assertTrue(error.getMessage().contains("Tổ hợp đã tồn tại"));assertEquals(1,fixture.product().getVariants().size());
        assertEquals(0,fixture.product().getStock());verify(fixture.variants(),never()).saveAndFlush(any());
    }

    @Test void invalidNewStocksShoesAndCategoryChoicesAreRejectedBeforePersistence() {
        var shoe=inventory(2,variant(1,"40",20));
        for (Integer stock : java.util.Arrays.asList(null,-1,1000001)) {
            assertThrows(BadRequestException.class,()->shoe.service().create(7L,ProductVariantDto.builder().size("41").stock(stock).build()));
        }
        for (String size : List.of("34","42.5","44","not-a-size"))
            assertThrows(BadRequestException.class,()->shoe.service().create(7L,ProductVariantDto.builder().size(size).stock(20).build()));
        assertThrows(BadRequestException.class,()->inventory(3).service().create(7L,ProductVariantDto.builder().stock(20).build()));
        assertThrows(BadRequestException.class,()->inventory(1).service().create(7L,ProductVariantDto.builder().stock(20).build()));
        assertThrows(BadRequestException.class,()->shoe.service().create(7L,ProductVariantDto.builder().id(8L).size("41").stock(20).build()));
        verify(shoe.variants(),never()).saveAndFlush(any());
    }

    @Test void patchCannotSilentlyRewriteCombinationOrLegacyInventory() {
        var current=variant(1,"40",20);var fixture=inventory(2,current);
        var request=ProductVariantDto.builder().stock(15).expectedStock(20).color("Đỏ").build();

        assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,request));

        assertEquals(20,current.getStock());assertEquals("Trắng / Đen",current.getColor());
        request.setColor(null);request.setSize("41");
        assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,request));
        request.setSize(null);current.setLegacy(true);current.setActive(false);
        assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,request));
        assertFalse(current.getActive());assertEquals(20,current.getStock());verify(fixture.products(),never()).saveAndFlush(any());
    }

    @Test void patchProtectsReservedItemsAndStaleStockWithoutChangingPhysicalInventory() {
        var current=variant(1,"40",20);current.setReservedStock(2);var fixture=inventory(2,current);
        var deactivate=ProductVariantDto.builder().stock(20).expectedStock(20).active(false).build();

        assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,deactivate));
        assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,ProductVariantDto.builder().stock(25).expectedStock(19).build()));

        assertTrue(current.getActive());assertEquals(20,current.getStock());assertEquals(2,current.getReservedStock());
        verify(fixture.products(),never()).saveAndFlush(any());
    }

    @Test void disablingAndReactivatingAnExistingCombinationDerivesPublicChoicesAndKeepsStock() {
        var current=variant(1,"40",20);var fixture=inventory(2,current);

        var disabled=fixture.service().update(7L,1L,ProductVariantDto.builder().stock(20).expectedStock(20).active(false).build());

        assertFalse(disabled.getInStock());assertEquals(20,current.getStock());assertEquals(0,fixture.product().getStock());
        assertEquals("[]",fixture.product().getAvailableSizes());assertNull(fixture.product().getColorName());
        var enabled=fixture.service().update(7L,1L,ProductVariantDto.builder().stock(17).expectedStock(20).active(true).build());
        assertTrue(enabled.getInStock());assertEquals(17,fixture.product().getStock());assertEquals("[\"40\"]",fixture.product().getAvailableSizes());
        assertEquals("Trắng / Đen",fixture.product().getColorName());
    }

    @Test void explicitInitialAccessoryVariantsKeepTheDeclaredCommonPackaging() {
        var product=Product.builder().sku("HG-ACCESSORY-010").stock(0).quantityPerPack("10 m")
                .category(Category.builder().id(5L).build()).build();

        ProductVariantService.initialize(product,ProductDto.builder().variants(List.of(
                ProductVariantDto.builder().color("Trắng").stock(20).build(),ProductVariantDto.builder().color("Đỏ").stock(20).build())).build());

        assertEquals("10 m",product.getQuantityPerPack());assertEquals(40,product.getStock());
        assertTrue(product.getVariants().stream().allMatch(v->"10 m".equals(v.getPackaging())));
        assertEquals("Trắng, Đỏ",product.getColorName());
    }

    @Test void newChoiceSummariesCannotOverflowExistingColumnsAndFailBeforeSaving() {
        var existing=variant(1,"40",20);existing.setColor("A".repeat(190));var fixture=inventory(2,existing);

        assertThrows(BadRequestException.class,()->fixture.service().create(7L,
                ProductVariantDto.builder().color("B".repeat(20)).size("41").stock(20).build()));

        assertEquals(1,fixture.product().getVariants().size());assertEquals(20,fixture.product().getStock());
        verify(fixture.variants(),never()).saveAndFlush(any());
    }

    @Test void actualJacksonDistinguishesExplicitNullOptionsFromAnUnchangedStockOnlyPatch() throws Exception {
        var current=variant(1,"40",20);current.setWeightGrip("4U-G5");current.setPackaging("10 m");
        var fixture=inventory(2,current);var mapper=new ObjectMapper();
        for (String field : List.of("color","size","weightGrip","packaging")) {
            var request=mapper.readValue("{\"stock\":19,\"expectedStock\":20,\""+field+"\":null}",ProductVariantDto.class);
            assertThrows(BadRequestException.class,()->fixture.service().update(7L,1L,request));
            assertEquals(20,current.getStock());
        }
        var stockOnly=mapper.readValue("{\"stock\":19,\"expectedStock\":20}",ProductVariantDto.class);
        var updated=fixture.service().update(7L,1L,stockOnly);
        assertEquals(19,updated.getStock());assertEquals("Trắng / Đen",updated.getColor());assertEquals("40",updated.getSize());
        var response=mapper.readTree(mapper.writeValueAsString(updated));
        for (String field : List.of("colorSupplied","sizeSupplied","weightGripSupplied","packagingSupplied")) assertFalse(response.has(field));
    }
}
