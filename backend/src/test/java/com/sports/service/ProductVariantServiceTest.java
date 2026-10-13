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
import static org.junit.jupiter.api.Assertions.*;

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
}
