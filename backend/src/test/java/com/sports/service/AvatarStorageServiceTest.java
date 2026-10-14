package com.sports.service;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;
class AvatarStorageServiceTest {
    Path directory;
    @BeforeEach void retainArtifacts() throws Exception {
        Path workspace=Path.of("").toAbsolutePath().normalize();
        if (workspace.getFileName().toString().equals("backend")) workspace=workspace.getParent();
        if (!java.nio.file.Files.isRegularFile(workspace.resolve("backend/pom.xml")))
            throw new IllegalStateException("Test artifacts must remain inside the project workspace");
        directory=workspace.resolve("backups/project-completion-20261013/avatar-test-"+java.util.UUID.randomUUID());
        java.nio.file.Files.createDirectories(directory);
        System.out.println("Retained avatar test artifacts: "+directory);
    }
    AvatarStorageService service() {
        var service = new AvatarStorageService();
        ReflectionTestUtils.setField(service, "storageRoot", directory.toString());
        return service;
    }
    @Test void realImageIsReencodedAndResizedWithOpaqueKey() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1000, 500, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var storage = service();
        String key = storage.store(new MockMultipartFile("file", "../../photo.png", "image/png", bytes.toByteArray()));
        assertTrue(key.matches("[0-9a-f-]{36}\\.png"));
        var image = ImageIO.read(storage.read(key).toFile());
        assertEquals(512, image.getWidth());
        assertEquals(256, image.getHeight());
        assertThrows(ResourceNotFoundException.class, () -> storage.read("../outside.png"));
    }
    @Test void fakeAndOversizeImagesAreRejected() {
        var storage = service();
        assertThrows(BadRequestException.class, () -> storage.store(new MockMultipartFile("file", "image.png", "image/png", "<script>x</script>".getBytes())));
        assertThrows(BadRequestException.class, () -> storage.store(new MockMultipartFile("file", "image.png", "image/png", new byte[5*1024*1024+1])));
    }
}
