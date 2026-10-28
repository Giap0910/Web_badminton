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
    @Test void fullSearchMatchesOnlyNamesAndTreatsSqlWildcardsAsLiteralCharacters() {
        jakarta.persistence.criteria.Root<Product> root = mock(jakarta.persistence.criteria.Root.class, RETURNS_DEEP_STUBS);
        var cb = mock(jakarta.persistence.criteria.CriteriaBuilder.class, RETURNS_DEEP_STUBS);
        var query = mock(jakarta.persistence.criteria.CriteriaQuery.class);
        var patterns = java.util.Map.of(" 100 ", "%100%", "%", "%!%%", "_", "%!_%", "!", "%!!%", "Li-Ning", "%lining%", "ĐỎ", "%do%");
        patterns.forEach((term, pattern) -> {
            clearInvocations(cb, root);
            ProductSpecification.filterProducts(term, null, null, null, null, null, null, null, null).toPredicate(root, query, cb);
            verify(cb).like(any(jakarta.persistence.criteria.Expression.class), eq(pattern), eq('!'));
            verify(root).get("name");
            verify(cb).function("replace", String.class, cb.lower(root.get("name")), cb.literal("đ"), cb.literal("d"));
            for (String field : List.of("description", "sku", "brand")) verify(root, never()).get(field);
        });
    }

    @Test void vietnameseSuggestionsMatchAccentsCaseDecomposedUnicodeAndLetterDWithoutMatchingPrices() {
        var repository = mock(ProductRepository.class);
        var service = new ProductService(repository, mock(CategoryRepository.class),
                mock(ReviewService.class), mock(ProductImageRepository.class));
        var racket = product(2L, "Vợt Yonex Astrox 88D Pro Đỏ", "HG-RACKET-002");
        var shoe = product(3L, "Giày Yonex Power Cushion", "HG-SHOE-003");
        var shirt = product(4L, "Áo thi đấu Victor", "HG-CLOTHING-004");
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(racket, shoe, shirt));
        for (var term : List.of("vot", "VỢT", "vợt", "  VoT  ",
                java.text.Normalizer.normalize("VỢT", java.text.Normalizer.Form.NFD))) {
            assertEquals(List.of(2L), service.getSuggestions(term).stream().map(p -> p.getId()).toList(), term);
        }
        for (var term : List.of("giay", "GIÀY", java.text.Normalizer.normalize("Giày", java.text.Normalizer.Form.NFD)))
            assertEquals(List.of(3L), service.getSuggestions(term).stream().map(p -> p.getId()).toList(), term);
        for (var term : List.of("do", "ĐỎ", "đỏ", "  Do  "))
            assertEquals(List.of(2L), service.getSuggestions(term).stream().map(p -> p.getId()).toList(), term);
        assertTrue(service.getSuggestions("100000").isEmpty());
    }

    @Test void normalizedNamesPreserveBrandAliasesButExcludeSkuOnlyMatchesAndKeepSuggestionBounds() {
        var repository = mock(ProductRepository.class);
        var service = new ProductService(repository, mock(CategoryRepository.class),
                mock(ReviewService.class), mock(ProductImageRepository.class));
        var racket = product(2L, java.text.Normalizer.normalize("Vợt Li-Ning Axforce", java.text.Normalizer.Form.NFD), "HG-RACKET-002");
        racket.setBrand("Lining");
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(racket));
        for (var term : List.of("vot", "VỢT", "lining", "LI-NING", "li ning"))
            assertEquals(List.of(2L), service.getSuggestions(term).stream().map(p -> p.getId()).toList(), term);
        assertTrue(service.getSuggestions("hg-racket-002").isEmpty());
        for (var term : List.of("", "   ", "đ", "y", "v".repeat(201))) assertTrue(service.getSuggestions(term).isEmpty(), term);
        assertTrue(service.getSuggestions(null).isEmpty());
    }

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
        assertEquals(List.of(2L, 345L), service.getSuggestions("10").stream().map(p -> p.getId()).toList());
        assertEquals(0, service.getSuggestions("y").size());
        assertEquals(List.of(377L, 2L), service.getSuggestions("yo").stream().map(p -> p.getId()).toList());
    }

    private Product product(Long id, String name, String sku) {
        return Product.builder().id(id).name(name).brand(name.contains("Victor") ? "Victor" : "Yonex")
                .sku(sku).price(BigDecimal.valueOf(100000)).stock(20).build();
    }

    @Test void everySuggestionContainsTheQueryInItsNameWithoutSkuOrBrandOnlyResults() {
        var repository = mock(ProductRepository.class);
        var service = new ProductService(repository, mock(CategoryRepository.class), mock(ReviewService.class), mock(ProductImageRepository.class));
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(
                product(1L, "Vợt Astrox 100ZZ Đỏ", "HG-001"), product(2L, "Áo thi đấu 100% Cotton", "HG-010"),
                product(3L, "Giày A_B", "HG-088"), product(4L, "Vợt Li-Ning Blade 10 Pro", "HG-004")));
        var expected = java.util.Map.of("100", java.util.Set.of(1L, 2L), "88", java.util.Set.<Long>of(),
                "Yonex", java.util.Set.<Long>of(), "100%", java.util.Set.of(2L), "A_B", java.util.Set.of(3L),
                "li ning", java.util.Set.of(4L), "VỢT", java.util.Set.of(1L, 4L), "%_", java.util.Set.<Long>of());
        expected.forEach((term, ids) -> assertEquals(ids,
                service.getSuggestions(term).stream().map(p -> p.getId()).collect(java.util.stream.Collectors.toSet()), term));
    }
}
