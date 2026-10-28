package com.sports.service;

import com.sports.controller.ProductMediaController;
import com.sports.entity.Product;
import com.sports.entity.ProductImage;
import com.sports.exception.GlobalExceptionHandler;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ProductImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProductMediaServiceTest {
    private final ProductImageRepository images = mock(ProductImageRepository.class);
    private final ProductImageStorage storage = mock(ProductImageStorage.class);
    private final ProductMediaService media = new ProductMediaService(images, storage);
    private final String name = "11111111-2222-3333-4444-555555555555.webp";
    private final String url = "/api/media/products/1/" + name;
    private Product product;

    @BeforeEach void approvedAsset() {
        product = Product.builder().id(1L).brand("Yonex").catalogVisible(true).build();
        var image = ProductImage.builder().product(product).imageUrl(url).rightsApproved(true).modelVerified(true).build();
        when(images.findFirstByProductIdAndImageUrlAndRightsApprovedTrueAndModelVerifiedTrue(1L, url))
                .thenReturn(Optional.of(image));
    }

    @Test void shouldServeApprovedBytesAndImageHeadersThroughController() throws Exception {
        byte[] bytes = {82, 73, 70, 70, 1};
        when(storage.read(1, name)).thenReturn(bytes);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new ProductMediaController(media)).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().bytes(bytes))
                .andExpect(content().contentType("image/webp"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "no-cache"));
    }

    @Test void shouldRejectUnapprovedOrUnlinkedFileWithoutReadingStorage() {
        when(images.findFirstByProductIdAndImageUrlAndRightsApprovedTrueAndModelVerifiedTrue(1L, url))
                .thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> media.read(1L, name));
        verifyNoInteractions(storage);
    }

    @Test void shouldNotExposeHiddenProductEvenWhenItsImageWasApproved() {
        product.setCatalogVisible(false);
        assertThrows(ResourceNotFoundException.class, () -> media.read(1L, name));
        verifyNoInteractions(storage);
    }

    @Test void shouldNotExposeUnsupportedBrand() {
        product.setBrand("Other");
        assertThrows(ResourceNotFoundException.class, () -> media.read(1L, name));
        verifyNoInteractions(storage);
    }

    @Test void shouldRejectInvalidProductBeforeRepositoryLookup() {
        clearInvocations(images);
        assertThrows(ResourceNotFoundException.class, () -> media.read(-1L, name));
        assertThrows(ResourceNotFoundException.class, () -> media.read(null, name));
        verifyNoInteractions(images, storage);
    }

    @Test void shouldReturn404ForMissingStoredFile() throws Exception {
        when(storage.read(1, name)).thenThrow(new ResourceNotFoundException("Missing"));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new ProductMediaController(media)).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get(url)).andExpect(status().isNotFound());
    }
}
