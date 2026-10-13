package com.sports.service;

import com.sports.entity.Product;
import com.sports.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductSuggestionsTest {
    @Test void shortNumericQueryPrioritizesModelNameAndIgnoresDescription() {
        var repository = mock(ProductRepository.class);
        var service = new ProductService(repository, mock(CategoryRepository.class),
                mock(ReviewService.class), mock(ProductImageRepository.class));
        var string = product(377L, "Dây cước Yonex BG6", "HG-ACCESSORY-001");
        string.setDescription("Quy cách 10m; giá 100000 đồng");
        var racket = product(2L, "Vợt Yonex Nanoflare 1000Z", "HG-RACKET-002");
        var skuMatch = product(378L, "Quấn cán Victor", "HG-ACCESSORY-010");
        var suffix = product(345L, "Giày Kawasaki SB421810", "HG-SHOE-003");
        suffix.setBrand("Kawasaki");
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(string, skuMatch, suffix, racket));
        assertEquals(List.of(2L, 345L, 378L), service.getSuggestions("10").stream().map(p -> p.getId()).toList());
        assertEquals(0, service.getSuggestions("y").size());
        assertEquals(List.of(377L, 2L), service.getSuggestions("yo").stream().map(p -> p.getId()).toList());
    }

    private Product product(Long id, String name, String sku) {
        return Product.builder().id(id).name(name).brand(name.contains("Victor") ? "Victor" : "Yonex")
                .sku(sku).price(BigDecimal.valueOf(100000)).stock(20).build();
    }
}
