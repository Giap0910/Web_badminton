package com.sports.service;

import com.sports.controller.BannerController;
import com.sports.entity.BannerImage;
import com.sports.repository.BannerImageRepository;
import com.sports.exception.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.util.*;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BannerServiceTest {
    final BannerImageRepository repository = mock(BannerImageRepository.class);
    final Map<Integer, BannerImage> rows = new HashMap<>();
    final Path root = Path.of("target/banner-service-test-" + UUID.randomUUID()).toAbsolutePath();
    final BannerService service = new BannerService(repository, root.toString());

    @BeforeEach void arrangeSlots() {
        for (int i = 1; i <= 4; i++) rows.put(i, BannerImage.builder().position(i).build());
        when(repository.findAll()).thenAnswer(call -> new ArrayList<>(rows.values()));
        when(repository.findByPositionForUpdate(anyInt())).thenAnswer(call -> Optional.ofNullable(rows.get(call.getArgument(0))));
        when(repository.findById(anyInt())).thenAnswer(call -> Optional.ofNullable(rows.get(call.getArgument(0))));
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }

    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    MockMultipartFile png() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(32, 12, BufferedImage.TYPE_INT_RGB), "png", output);
        return new MockMultipartFile("file", "../../outside.jpg", "image/jpeg", output.toByteArray());
    }

    @Test void publicListHasFourPositionsWithoutDuplicatingMissingImages() throws Exception {
        var upload = service.replace(3, png(), true);
        var slots = service.list();
        assertEquals(List.of(1,2,3,4), slots.stream().map(BannerService.Slot::position).toList());
        assertEquals(upload.url(), slots.get(2).url()); assertEquals("READY", slots.get(2).status());
        for (int i : List.of(0,1,3)) { assertNull(slots.get(i).url()); assertEquals("UPDATING", slots.get(i).status()); }
    }

    @Test void replacementKeepsOtherSlotsAndOldFile() throws Exception {
        var first = service.replace(1,png(),true); var old = service.replace(3,png(),true);
        var updated = service.replace(3,png(),true);
        assertEquals(first.url(),service.list().get(0).url()); assertNotEquals(old.url(),updated.url());
        assertTrue(Files.isRegularFile(root.resolve("3").resolve(old.url().substring(old.url().lastIndexOf('/')+1))));
        assertTrue(updated.url().matches("/api/media/banners/3/[0-9a-f-]{36}\\.png"));
        assertThrows(ResourceNotFoundException.class,()->service.read(3,old.url().substring(old.url().lastIndexOf('/')+1)));
        assertArrayEquals(png().getBytes(),service.read(3,updated.url().substring(updated.url().lastIndexOf('/')+1)).bytes());
        verify(repository,times(2)).findByPositionForUpdate(3);
    }

    @ParameterizedTest @ValueSource(ints={-1,0,5,99})
    void invalidPositionNeverWritesFile(int position) throws Exception {
        var file = png();
        assertThrows(BadRequestException.class,()->service.replace(position,file,true));
        assertFalse(Files.exists(root)); verify(repository,never()).saveAndFlush(any());
    }

    @Test void requiresExplicitRightsConfirmation() throws Exception {
        var file = png();
        assertThrows(BadRequestException.class,()->service.replace(1,file,false));
        verify(repository,never()).findByPositionForUpdate(anyInt()); assertFalse(Files.exists(root));
    }

    @Test void unsupportedUploadDoesNotChangeExistingImage() throws Exception {
        String previous = service.replace(2,png(),true).url();
        var disguised = new MockMultipartFile("file","photo.png","image/png","not an image".getBytes());
        assertEquals(415,assertThrows(ProductImageException.class,()->service.replace(2,disguised,true)).getStatus());
        assertEquals(previous,rows.get(2).getImageUrl());
    }

    @Test void oversizeUploadIsRejectedBeforeReadingBytes() {
        var file = mock(MultipartFile.class); when(file.getSize()).thenReturn(6L*1024*1024);
        assertEquals(413,assertThrows(ProductImageException.class,()->service.replace(1,file,true)).getStatus());
        assertNull(rows.get(1).getImageUrl()); verify(repository,never()).saveAndFlush(any());
        assertFalse(Files.exists(root));
    }

    @Test void missingMigrationCannotSilentlyCreateUnmanagedSlot() throws Exception {
        rows.remove(4); var file=png();
        var error=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.replace(4,file,true));
        assertEquals(503,error.getStatusCode().value());assertFalse(Files.exists(root));
    }

    @Test void traversalAndUntrustedUrlsAreNotServed() {
        rows.get(1).setImageUrl("https://external.test/banner.png");
        assertNull(service.list().get(0).url());
        assertThrows(ResourceNotFoundException.class,()->service.read(1,"..\\outside.png"));
        assertThrows(ResourceNotFoundException.class,()->service.read(1,"11111111-1111-1111-1111-111111111111.png"));
    }

    @Test void controllerSupportsMultipartAndSafeImageHeaders() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new BannerController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/banners")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        var result=mvc.perform(multipart("/api/admin/banners/2/image").file(png()).param("approved","true")
                .with(request->{request.setMethod("PUT");return request;})).andExpect(status().isOk())
                .andExpect(jsonPath("$.position").value(2)).andReturn();
        String url=new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("url").asText();
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/png"))
                .andExpect(header().string("Cache-Control","no-cache")).andExpect(header().string("X-Content-Type-Options","nosniff"));
        mvc.perform(multipart("/api/admin/banners/2/image").param("approved","true")
                .with(request->{request.setMethod("PUT");return request;})).andExpect(status().isBadRequest());
    }

    @Configuration @EnableMethodSecurity(proxyTargetClass=true)
    static class SecurityTestConfig {
        @Bean BannerService banners() { return new BannerService(mock(BannerImageRepository.class),"target/banner-security-test"); }
    }

    @Test void regularUserCannotUploadEvenWhenCallingServiceDirectly() throws Exception {
        try(var context=new AnnotationConfigApplicationContext(SecurityTestConfig.class)) {
            var secured=context.getBean(BannerService.class);var file=png();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user","",
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))));
            assertThrows(AccessDeniedException.class,()->secured.replace(1,file,true));
        }
    }
}
