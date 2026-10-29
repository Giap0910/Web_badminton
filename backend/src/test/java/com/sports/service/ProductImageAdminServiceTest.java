package com.sports.service;

import com.sports.entity.*;
import com.sports.repository.*;
import com.sports.exception.*;
import com.sports.controller.AdminCatalogController;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.context.annotation.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProductImageAdminServiceTest {
    final ProductRepository products = mock(ProductRepository.class);
    final ProductImageRepository images = mock(ProductImageRepository.class);
    final ProductImageStorage storage = mock(ProductImageStorage.class);
    final ProductService catalog = mock(ProductService.class);
    final ProductImageAdminService service = new ProductImageAdminService(products, images, storage, catalog);
    final Product product = Product.builder().id(7L).brand("Yonex").catalogVisible(false).build();
    final List<ProductImage> rows = new ArrayList<>();
    final MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", new byte[]{1});
    final String filename = "11111111-2222-3333-4444-555555555555.png";

    @BeforeEach void arrange() {
        when(products.findById(7L)).thenReturn(Optional.of(product));
        when(products.findByIdForUpdate(7L)).thenReturn(Optional.of(product));
        when(images.findByProductIdOrderByDisplayOrderAsc(7L)).thenAnswer(call -> new ArrayList<>(rows));
        when(images.saveAndFlush(any())).thenAnswer(call -> { ProductImage row=call.getArgument(0); rows.add(row); return row; });
        when(storage.storeUpload(7L, file)).thenReturn(new ProductImageStorage.StoredImage("7/"+filename, filename, "a".repeat(64), "image/png", 2, 2, 20));
    }

    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    ProductImage image(int position, String name) {
        return ProductImage.builder().id((long) rows.size()+1).product(product).displayOrder(position)
                .imageUrl("/api/media/products/7/"+name).rightsApproved(true).modelVerified(true).build();
    }

    @Test void replacesOnlyRequestedSlotAndKeepsOldImageReadableForHistory() {
        var first=image(1, "first.png"); var previous=image(3, "old.png"); rows.addAll(List.of(first,previous));
        var result=service.replace(7,3,file,true);
        assertEquals(first.getImageUrl(), result.get(0).url()); assertNull(result.get(1).url());
        assertTrue(result.get(2).url().endsWith(filename)); assertNull(result.get(3).url());
        assertEquals(99,previous.getDisplayOrder()); assertTrue(previous.getRightsApproved());
        assertEquals("/api/media/products/7/old.png",previous.getImageUrl()); verify(products).findByIdForUpdate(7L);
        verify(images,never()).deleteByProductId(any()); verify(storage,never()).read(anyLong(),anyString());
    }

    @Test void firstImageBecomesCoverWithoutPublishingDraft() {
        service.replace(7,1,file,true);
        assertTrue(product.getImageUrl().endsWith(filename)); assertFalse(product.getCatalogVisible());
        assertEquals(1,rows.get(0).getDisplayOrder()); assertTrue(rows.get(0).getModelVerified());
    }

    @ParameterizedTest @ValueSource(ints={-1,0,5,99})
    void invalidPositionNeverWritesFileOrDatabase(int position) {
        assertThrows(BadRequestException.class,()->service.replace(7,position,file,true));
        verifyNoInteractions(storage); verify(products,never()).findByIdForUpdate(any());
    }

    @Test void missingApprovalNeverReadsUpload() {
        assertThrows(BadRequestException.class,()->service.replace(7,1,file,false));
        verifyNoInteractions(storage); assertTrue(rows.isEmpty());
    }

    @Test void unknownProductNeverCreatesFiles() {
        assertThrows(ResourceNotFoundException.class,()->service.replace(999,1,file,true));
        verifyNoInteractions(storage);
    }

    @Test void failedUploadPreservesExistingSlotAndCover() {
        var old=image(1,"old.png");rows.add(old);product.setImageUrl(old.getImageUrl());
        when(storage.storeUpload(7L,file)).thenThrow(new ProductImageException(503,"STORAGE_UNAVAILABLE","Lỗi ghi ảnh"));
        assertThrows(ProductImageException.class,()->service.replace(7,1,file,true));
        assertEquals(1,old.getDisplayOrder());assertEquals(old.getImageUrl(),product.getImageUrl());
        verify(images,never()).saveAndFlush(any());
    }

    @Test void publishRequiresAllFourDistinctPositions() {
        rows.add(image(1,"one.png"));rows.add(image(4,"four.png"));
        assertThrows(BadRequestException.class,()->service.publish(7));verifyNoInteractions(catalog);
        rows.add(image(2,"two.png"));rows.add(image(3,"three.png"));
        service.publish(7);verify(catalog).updateVisibility(7L,true);
    }

    @Test void unapprovedOrArchivedImagesCannotFillMissingPositions() {
        var unapproved=image(2,"two.png");unapproved.setRightsApproved(false);
        rows.addAll(List.of(image(1,"one.png"),unapproved,image(99,"old.png")));
        assertNull(service.list(7).get(1).url());assertNull(service.list(7).get(3).url());
        assertThrows(ResourceNotFoundException.class,()->service.preview(7,2));
    }

    @Test void authenticatedPreviewWorksForHiddenDraft() {
        rows.add(image(3,filename));when(storage.read(7,filename)).thenReturn(new byte[]{8,9});
        var result=service.preview(7,3);
        assertEquals("image/png",result.contentType());assertArrayEquals(new byte[]{8,9},result.bytes());
    }

    @Test void multipartControllerAndPrivatePreviewHeaders() throws Exception {
        var controller=new AdminCatalogController(mock(ProductExcelService.class),mock(ProductImportService.class),service,catalog);
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(multipart("/api/admin/products/7/images/3").file(file).param("approved","true")
                .with(request->{request.setMethod("PUT");return request;}))
                .andExpect(status().isOk()).andExpect(jsonPath("$[2].position").value(3));
        when(storage.read(7,filename)).thenReturn(new byte[]{8,9});
        mvc.perform(get("/api/admin/products/7/images/3/content")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control","private, no-store"));
        mvc.perform(multipart("/api/admin/products/7/images/5").file(file).param("approved","true")
                .with(request->{request.setMethod("PUT");return request;})).andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/admin/products/7/images/1").param("approved","true")
                .with(request->{request.setMethod("PUT");return request;})).andExpect(status().isBadRequest());
    }

    @Configuration @EnableMethodSecurity(proxyTargetClass=true)
    static class SecuredConfig {
        @Bean ProductImageAdminService service() {
            return new ProductImageAdminService(mock(ProductRepository.class),mock(ProductImageRepository.class),
                    mock(ProductImageStorage.class),mock(ProductService.class));
        }
    }

    @Test void nonAdminCannotUseAnyImageMutation() {
        try(var context=new AnnotationConfigApplicationContext(SecuredConfig.class)) {
            var secured=context.getBean(ProductImageAdminService.class);
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user","",List.of(new SimpleGrantedAuthority("ROLE_USER"))));
            assertThrows(AccessDeniedException.class,()->secured.replace(7,1,file,true));
            assertThrows(AccessDeniedException.class,()->secured.list(7));
            assertThrows(AccessDeniedException.class,()->secured.preview(7,1));
            assertThrows(AccessDeniedException.class,()->secured.publish(7));
        }
    }
}
