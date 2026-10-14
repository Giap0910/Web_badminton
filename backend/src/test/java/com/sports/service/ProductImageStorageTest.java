package com.sports.service;

import com.sports.exception.ProductImageException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductImageStorageTest {
    Path directory;
    @BeforeEach void retainArtifacts() throws IOException {
        Path workspace=Path.of("").toAbsolutePath().normalize();
        if (workspace.getFileName().toString().equals("backend")) workspace=workspace.getParent();
        if (!Files.isRegularFile(workspace.resolve("backend/pom.xml")))
            throw new IllegalStateException("Test artifacts must remain inside the project workspace");
        directory=workspace.resolve("backups/project-completion-20261013/product-image-test-"+java.util.UUID.randomUUID());
        Files.createDirectories(directory);
        System.out.println("Retained product image test artifacts: "+directory);
    }

    @Test
    void shouldStoreExactApprovedPngWithServerFileName() throws Exception {
        byte[] bytes = image("png");
        var storage = new ProductImageStorage(directory.resolve("products").toString());
        var file = new MockMultipartFile("file", "../../outside.svg", "image/jpeg", bytes);

        var result = storage.store(35, file, hash(bytes));

        assertEquals("image/png", result.mimeType());
        assertEquals(3, result.width());
        assertEquals(2, result.height());
        assertTrue(result.fileName().matches("[0-9a-f-]{36}\\.png"));
        assertArrayEquals(bytes, Files.readAllBytes(directory.resolve("products").resolve(result.storageKey())));
        assertFalse(Files.exists(directory.resolve("outside.svg")));
    }

    @Test
    void shouldStoreJpegWithoutRewritingApprovedBytes() throws Exception {
        byte[] bytes = image("jpeg");
        var storage = new ProductImageStorage(directory.toString());

        var result = storage.store(1, upload(bytes), hash(bytes));

        assertEquals("image/jpeg", result.mimeType());
        assertEquals(bytes.length, result.byteSize());
        assertArrayEquals(bytes, Files.readAllBytes(directory.resolve(result.storageKey())));
    }

    @Test
    void shouldRejectMissingApprovalBeforeReadingOrCreatingStorage() {
        var storage = new ProductImageStorage(directory.resolve("not-created").toString());
        var file = mock(org.springframework.web.multipart.MultipartFile.class);

        var exception = assertThrows(ProductImageException.class, () -> storage.store(1, file, null));

        assertEquals("IMAGE_RIGHTS_NOT_APPROVED", exception.getCode());
        verifyNoInteractions(file);
        assertFalse(Files.exists(directory.resolve("not-created")));
    }

    @Test
    void shouldRejectDifferentFileWithoutCreatingStorage() throws Exception {
        var storage = new ProductImageStorage(directory.resolve("not-created").toString());
        byte[] bytes = image("png");

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, upload(bytes), "0".repeat(64)));

        assertEquals(409, exception.getStatus());
        assertFalse(Files.exists(directory.resolve("not-created")));
    }

    @Test
    void shouldRejectSvgEvenWithMisleadingMimeAndApprovedHash() throws Exception {
        byte[] bytes = "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes();
        var storage = new ProductImageStorage(directory.toString());

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, upload(bytes), hash(bytes)));

        assertEquals(415, exception.getStatus());
        assertFalse(Files.exists(directory.resolve("1")));
    }

    @Test
    void shouldRejectCorruptFileWithRealPngSignature() throws Exception {
        byte[] bytes = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        var storage = new ProductImageStorage(directory.toString());

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, upload(bytes), hash(bytes)));

        assertEquals(400, exception.getStatus());
        assertFalse(Files.exists(directory.resolve("1")));
    }

    @Test
    void shouldEnforceActualStreamLimitWhenReportedSizeIsWrong() throws Exception {
        var file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(1L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[5 * 1024 * 1024 + 1]));
        var storage = new ProductImageStorage(directory.toString());

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, file, "0".repeat(64)));

        assertEquals(413, exception.getStatus());
        assertFalse(Files.exists(directory.resolve("1")));
    }

    @Test
    void shouldRejectHugeDimensionsBeforeDecodingPixels() throws Exception {
        byte[] bytes = image("png");
        var buffer = java.nio.ByteBuffer.wrap(bytes);
        buffer.putInt(16, 100_000);
        buffer.putInt(20, 100_000);
        var crc = new java.util.zip.CRC32();
        crc.update(bytes, 12, 17);
        buffer.putInt(29, (int) crc.getValue());
        var storage = new ProductImageStorage(directory.toString());

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, upload(bytes), hash(bytes)));

        assertEquals(413, exception.getStatus());
        assertFalse(Files.exists(directory.resolve("1")));
    }

    @Test
    void shouldReturnStorageErrorWithoutOverwritingExistingFile() throws Exception {
        Path blocked = directory.resolve("blocked");
        Files.writeString(blocked, "existing-data");
        byte[] bytes = image("png");
        var storage = new ProductImageStorage(blocked.toString());

        var exception = assertThrows(ProductImageException.class,
                () -> storage.store(1, upload(bytes), hash(bytes)));

        assertEquals(503, exception.getStatus());
        assertEquals("existing-data", Files.readString(blocked));
    }

    @Test
    void shouldKeepEarlierAssetWhenSavingAnotherFile() throws Exception {
        byte[] bytes = image("png");
        var storage = new ProductImageStorage(directory.toString());

        var first = storage.store(1, upload(bytes), hash(bytes));
        var second = storage.store(1, upload(bytes), hash(bytes));

        assertNotEquals(first.storageKey(), second.storageKey());
        assertArrayEquals(bytes, Files.readAllBytes(directory.resolve(first.storageKey())));
        assertArrayEquals(bytes, Files.readAllBytes(directory.resolve(second.storageKey())));
    }

    private byte[] image(String format) throws IOException {
        var output = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), format, output));
        return output.toByteArray();
    }

    private MockMultipartFile upload(byte[] bytes) {
        return new MockMultipartFile("file", "test.jpg", "image/jpeg", bytes);
    }

    private String hash(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
