package com.sports.service;

import com.sports.exception.ProductImageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class ProductImageStorage {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000;
    private final Path root;

    public ProductImageStorage(@Value("${app.product-images.storage-root:storage/products}") String root) {
        this.root = resolveRoot(root);
    }

    static Path resolveRoot(String configured) {
        Path path = Path.of(configured);
        if (path.isAbsolute()) return path.normalize();
        Path workspace = Path.of("").toAbsolutePath().normalize();
        if (workspace.getFileName().toString().equals("backend")
                && Files.isRegularFile(workspace.resolve("pom.xml"))) workspace = workspace.getParent();
        return workspace.resolve(path).normalize();
    }

    public byte[] read(long productId, String fileName) {
        if (productId <= 0 || fileName == null
                || !fileName.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)")) throw missing();
        Path path = root.resolve(Long.toString(productId)).resolve(fileName);
        try {
            rejectSymbolicLinks(path);
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) throw missing();
            try (var input = Files.newInputStream(path, LinkOption.NOFOLLOW_LINKS)) {
                byte[] bytes = input.readNBytes(MAX_BYTES + 1);
                if (bytes.length == 0 || bytes.length > MAX_BYTES) throw missing();
                String format = detectedFormat(bytes);
                String extension = format.equals("JPEG") ? "jpg" : format.toLowerCase(Locale.ROOT);
                if (!fileName.endsWith("." + extension)) throw missing();
                return bytes;
            }
        } catch (IOException | SecurityException | ProductImageException exception) { throw missing(); }
    }

    private com.sports.exception.ResourceNotFoundException missing() {
        return new com.sports.exception.ResourceNotFoundException("Không tìm thấy ảnh sản phẩm đã duyệt");
    }

    public StoredImage store(long productId, MultipartFile file, String approvedSha256) {
        if (productId <= 0) throw error(400, "VALIDATION_ERROR", "ID sản phẩm không hợp lệ");
        requireApproval(approvedSha256);
        byte[] bytes = readUpload(file);
        String sha256 = hash(bytes);
        if (!sha256.equalsIgnoreCase(approvedSha256)) {
            throw error(409, "IMAGE_RIGHTS_NOT_APPROVED", "File không khớp ảnh đã được duyệt");
        }
        return storeBytes(productId, bytes, sha256);
    }

    private StoredImage storeBytes(long productId, byte[] bytes, String sha256) {
        var image = inspect(bytes);
        String fileName = UUID.randomUUID() + "." + image.extension();
        write(productId, fileName, bytes);
        return new StoredImage(productId + "/" + fileName, fileName, sha256,
                image.mimeType(), image.width(), image.height(), bytes.length);
    }

    public StoredImage storeUpload(long productId, MultipartFile file) {
        if (productId <= 0) throw error(400, "VALIDATION_ERROR", "ID sản phẩm không hợp lệ");
        byte[] bytes = readUpload(file);
        if (detectedFormat(bytes).equals("WEBP"))
            throw error(415, "UNSUPPORTED_IMAGE_TYPE", "Tải ảnh mới bằng JPG hoặc PNG; ảnh WebP cũ vẫn được giữ");
        return storeBytes(productId, bytes, hash(bytes));
    }

    private void requireApproval(String approvedSha256) {
        if (approvedSha256 == null || !approvedSha256.matches("(?i)[0-9a-f]{64}")) {
            throw error(409, "IMAGE_RIGHTS_NOT_APPROVED", "Chưa có mã băm file ảnh đã được duyệt");
        }
    }

    private byte[] readUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) throw error(400, "VALIDATION_ERROR", "Thiếu file ảnh");
        if (file.getSize() > MAX_BYTES) throw tooLarge();
        try (var input = file.getInputStream()) {
            byte[] bytes = input.readNBytes(MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES) throw tooLarge();
            if (bytes.length == 0) throw error(400, "VALIDATION_ERROR", "File ảnh rỗng");
            return bytes;
        } catch (IOException exception) {
            throw error(400, "VALIDATION_ERROR", "Không đọc được file ảnh");
        }
    }

    private ImageInfo inspect(byte[] bytes) {
        String format = detectedFormat(bytes);
        try (var input = new javax.imageio.stream.MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw unsupported();
            var reader = readers.next();
            try {
                if (!reader.getFormatName().equalsIgnoreCase(format)) throw unsupported();
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS) throw tooLarge();
                if (reader.read(0) == null) throw unsupported();
                return new ImageInfo(format.equals("JPEG") ? "jpg" : format.toLowerCase(Locale.ROOT),
                        format.equals("JPEG") ? "image/jpeg" : "image/" + format.toLowerCase(Locale.ROOT), width, height);
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw error(400, "VALIDATION_ERROR", "File ảnh không giải mã được");
        }
    }

    private String detectedFormat(byte[] bytes) {
        if (bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8
                && bytes[2] == (byte) 0xff) return "JPEG";
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8), png)) return "PNG";
        if (bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "WEBP";
        throw unsupported();
    }

    private boolean ascii(byte[] bytes, int start, String text) {
        for (int i = 0; i < text.length(); i++) {
            if (bytes[start + i] != text.charAt(i)) return false;
        }
        return true;
    }

    private void write(long productId, String fileName, byte[] bytes) {
        Path directory = root.resolve(Long.toString(productId));
        try {
            rejectSymbolicLinks(directory);
            Files.createDirectories(directory);
            rejectSymbolicLinks(directory);
            try (var output = Files.newOutputStream(directory.resolve(fileName),
                    StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS)) {
                output.write(bytes);
            }
        } catch (IOException | SecurityException exception) {
            throw error(503, "STORAGE_UNAVAILABLE", "Không lưu được ảnh vào storage dự án");
        }
    }

    private void rejectSymbolicLinks(Path path) throws IOException {
        for (Path current = path; current != null; current = current.getParent()) {
            if (Files.isSymbolicLink(current)) throw new IOException("Symbolic links are not allowed");
        }
    }

    private String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    private ProductImageException tooLarge() {
        return error(413, "IMAGE_TOO_LARGE", "Ảnh vượt giới hạn 5 MiB hoặc 20 megapixel");
    }

    private ProductImageException unsupported() {
        return error(415, "UNSUPPORTED_IMAGE_TYPE", "Định dạng ảnh không được bộ giải mã hỗ trợ");
    }

    private ProductImageException error(int status, String code, String message) {
        return new ProductImageException(status, code, message);
    }

    private record ImageInfo(String extension, String mimeType, int width, int height) {}

    public record StoredImage(String storageKey, String fileName, String sha256,
            String mimeType, int width, int height, long byteSize) {}
}
