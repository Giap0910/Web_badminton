package com.sports.service;

import com.sports.entity.*;
import com.sports.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductGalleryTest {
    private ProductImage image(String url,boolean rights,boolean model) {
        return ProductImage.builder().imageUrl(url).rightsApproved(rights).modelVerified(model).build();
    }
    @Test void onlyVerifiedLicensedInternalImagesAreAllowedAndDuplicatesAreRemoved() {
        var approved=ProductService.approvedImages(List.of(image("https://other-shop.vn/shoe.jpg",true,true),
                image("/api/media/products/1/a.jpg",false,true),image("/api/media/products/1/b.jpg",true,false),
                image("/api/media/products/1/c.jpg",true,true),image("/api/media/products/1/c.jpg",true,true)));
        assertEquals(List.of("/api/media/products/1/c.jpg"),approved);
        assertFalse(ProductService.internalImage("/api/media/products/1/../../private.jpg"));
    }
    @Test void everyProductHasFourSlotsWithoutDuplicatingASingleImage() {
        var empty=ProductService.gallerySlots(List.of());
        assertEquals(4,empty.size());assertTrue(empty.stream().allMatch(s -> s.url()==null && s.status().equals("UPDATING")));
        var one=ProductService.gallerySlots(List.of("/api/media/products/1/a.jpg"));
        assertEquals(4,one.size());assertEquals("READY",one.get(0).status());
        assertEquals(3,one.stream().filter(s -> s.url()==null).count());
    }
    @Test void oldWrongImageUrlIsNotReturnedToTheStorefront() {
        var images=mock(ProductImageRepository.class);var repository=mock(ProductRepository.class);
        var service=new ProductService(repository,mock(CategoryRepository.class),mock(ReviewService.class),images);
        when(images.findByProductIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(image("https://old-photo.test/person.jpg",false,false)));
        var dto=service.toDto(Product.builder().id(1L).name("Vợt Yonex").brand("Yonex").stock(20).imageUrl("https://old-photo.test/person.jpg").build());
        assertNull(dto.getImageUrl());assertTrue(dto.getImageUrls().isEmpty());assertEquals(4,dto.getImageSlots().size());
    }
}
