package com.sports.service;

import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class ReturnEvidenceStorage {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_DIMENSION = 4096;
    private static final long MAX_PIXELS = 16L * 1024 * 1024;
    private static final String KEY_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png";
    private final Path root;

    public ReturnEvidenceStorage() {
        this(Path.of("storage", "returns"));
    }

    public ReturnEvidenceStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) {
        String format = declaredFormat(file);
        byte[] bytes = readUpload(file);
        BufferedImage image = decode(bytes, format);
        byte[] png = encodePng(image);
        String key = UUID.randomUUID() + ".png";
        try {
            requireSafeDirectories();
            Files.createDirectories(root);
            requireSafeDirectories();
            try (var output = Files.newOutputStream(root.resolve(key), StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS)) {
                output.write(png);
            }
            return key;
        } catch (IOException | SecurityException exception) {
            throw new IllegalStateException("Không thể lưu minh chứng vào storage bảo hành", exception);
        }
    }

    private String declaredFormat(MultipartFile file) {
        if (file == null || file.getSize() < 0 || file.getSize() > MAX_BYTES)
            throw new BadRequestException("Ảnh minh chứng phải là JPEG hoặc PNG, tối đa 5 MiB");
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if ("image/jpeg".equals(type)) return "JPEG";
        if ("image/png".equals(type)) return "PNG";
        throw new BadRequestException("Chỉ nhận ảnh minh chứng JPEG hoặc PNG");
    }

    private byte[] readUpload(MultipartFile file) {
        try (var input = file.getInputStream()) {
            byte[] bytes = input.readNBytes(MAX_BYTES + 1);
            if (bytes.length == 0 || bytes.length > MAX_BYTES)
                throw new BadRequestException("Ảnh minh chứng rỗng hoặc vượt giới hạn 5 MiB");
            return bytes;
        } catch (IOException exception) {
            throw new BadRequestException("Không đọc được ảnh minh chứng");
        }
    }

    private BufferedImage decode(byte[] bytes, String format) {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            try {
                if (!reader.getFormatName().equalsIgnoreCase(format)) throw invalidImage();
                reader.setInput(input, true, true);
                validateDimensions(reader.getWidth(0), reader.getHeight(0));
                BufferedImage image = reader.read(0);
                if (image == null) throw invalidImage();
                validateDimensions(image.getWidth(), image.getHeight());
                return image;
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException exception) {
            throw invalidImage();
        }
    }

    private void validateDimensions(int width, int height) {
        if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION
                || (long) width * height > MAX_PIXELS)
            throw new BadRequestException("Ảnh minh chứng tối đa 4096 × 4096 và 16 megapixel");
    }

    private byte[] encodePng(BufferedImage image) {
        try (var bytes = new ByteArrayOutputStream(); var output = new MemoryCacheImageOutputStream(bytes)) {
            if (!ImageIO.write(image, "PNG", output)) throw invalidImage();
            output.flush();
            return bytes.toByteArray();
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private void requireSafeDirectories() throws IOException {
        for (Path directory = root; directory != null; directory = directory.getParent()) {
            if (!Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) continue;
            if (Files.isSymbolicLink(directory) || !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)
                    || !directory.toRealPath().equals(directory))
                throw new IOException("Đường dẫn storage bảo hành không hợp lệ");
        }
    }

    public Path read(String key) {
        if (key == null || !key.matches(KEY_PATTERN)) throw missingImage();
        Path file = root.resolve(key).normalize();
        try {
            requireSafeDirectories();
            if (!file.startsWith(root) || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                    || Files.isSymbolicLink(file) || !file.toRealPath().getParent().equals(root.toRealPath()))
                throw missingImage();
            return file;
        } catch (IOException | SecurityException exception) {
            throw missingImage();
        }
    }

    private BadRequestException invalidImage() {
        return new BadRequestException("File minh chứng không phải ảnh JPEG hoặc PNG hợp lệ");
    }

    private ResourceNotFoundException missingImage() {
        return new ResourceNotFoundException("Không tìm thấy minh chứng bảo hành");
    }
}
