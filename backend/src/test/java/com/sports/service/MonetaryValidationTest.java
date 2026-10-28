package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.exception.BadRequestException;
import com.sports.repository.CategoryRepository;
import com.sports.repository.ProductImageRepository;
import com.sports.repository.ProductRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MonetaryValidationTest {
    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"-1", "0.01", "9999999999.1", "10000000000", "1E+100"})
    void invalidMoneyCannotReachPaymentSignature(String input) {
        BigDecimal amount = input == null ? null : new BigDecimal(input);
        PayOSService service = new PayOSService();

        assertThrows(BadRequestException.class,
                () -> service.createSignatureForPaymentLink(100L, amount, "Test"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "1", "9999999998", "9999999999", "9999999999.00"})
    void signatureUsesExactIntegerAmount(String input) {
        PayOSService service = new PayOSService();
        ReflectionTestUtils.setField(service, "checksumKey", "test-only-key");
        ReflectionTestUtils.setField(service, "cancelUrl", "cancel");
        ReflectionTestUtils.setField(service, "returnUrl", "return");
        BigDecimal amount = new BigDecimal(input);
        String expected = service.hmacSha256("amount=" + amount.toBigIntegerExact()
                + "&cancelUrl=cancel&description=Test&orderCode=100&returnUrl=return", "test-only-key");

        assertEquals(expected, service.createSignatureForPaymentLink(100L, amount, "Test"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"-1", "0", "1.5", "10000000000", "1E+100"})
    void invalidProductPriceCannotBeCreatedOrUpdated(String input) {
        ProductRepository products = mock(ProductRepository.class);
        ProductService service = new ProductService(products, mock(CategoryRepository.class),
                mock(ReviewService.class), mock(ProductImageRepository.class));
        ProductDto dto = ProductDto.builder().name("Vợt").brand("Test")
                .price(input == null ? null : new BigDecimal(input)).build();

        assertThrows(BadRequestException.class, () -> service.createProduct(dto));
        assertThrows(BadRequestException.class, () -> service.updateProduct(1L, dto));
        verifyNoInteractions(products);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertFalse(factory.getValidator().validateProperty(dto, "price").isEmpty());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0.5", "10000000000"})
    void invalidOriginalPriceIsRejectedBeforePersistence(String input) {
        ProductRepository products = mock(ProductRepository.class);
        ProductService service = new ProductService(products, mock(CategoryRepository.class),
                mock(ReviewService.class), mock(ProductImageRepository.class));
        ProductDto dto = ProductDto.builder().price(BigDecimal.ONE)
                .originalPrice(new BigDecimal(input)).build();

        assertThrows(BadRequestException.class, () -> service.createProduct(dto));
        assertThrows(BadRequestException.class, () -> service.updateProduct(1L, dto));
        verifyNoInteractions(products);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertFalse(factory.getValidator().validateProperty(dto, "originalPrice").isEmpty());
        }
    }
}
