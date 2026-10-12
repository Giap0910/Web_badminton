package com.sports.service;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;

@Service
public class AvatarStorageService {
    @Value("${app.avatars.storage-root:storage/avatars}") private String storageRoot;
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024)
            throw new BadRequestException("Ảnh phải là JPG hoặc PNG, tối đa 5MB");
        try {
            BufferedImage image = readImage(file);
            String key = UUID.randomUUID() + ".png";
            Path root = Path.of(storageRoot).toAbsolutePath().normalize();
            Files.createDirectories(root);
            try (OutputStream output = Files.newOutputStream(root.resolve(key), StandardOpenOption.CREATE_NEW)) {
                ImageIO.write(resize(image), "png", output);
            }
            return key;
        } catch (IOException exception) {
            throw new BadRequestException("Không thể đọc hoặc lưu ảnh đại diện");
        }
    }
    private BufferedImage readImage(MultipartFile file) throws IOException {
        try (var stream = file.getInputStream(); var input = ImageIO.createImageInputStream(stream)) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new BadRequestException("File không phải ảnh JPG hoặc PNG hợp lệ");
            var reader = readers.next();
            try {
                reader.setInput(input);
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG"))
                    throw new BadRequestException("Chỉ nhận ảnh JPG hoặc PNG");
                if (reader.getWidth(0) > 4096 || reader.getHeight(0) > 4096)
                    throw new BadRequestException("Kích thước ảnh tối đa 4096 × 4096");
                return reader.read(0);
            } finally { reader.dispose(); }
        }
    }
    private BufferedImage resize(BufferedImage image) {
        double scale = Math.min(1.0, 512.0 / Math.max(image.getWidth(), image.getHeight()));
        var output = new BufferedImage(Math.max(1, (int)(image.getWidth() * scale)),
                Math.max(1, (int)(image.getHeight() * scale)), BufferedImage.TYPE_INT_ARGB);
        var graphics = output.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.drawImage(image, 0, 0, output.getWidth(), output.getHeight(), null);
        graphics.dispose();
        return output;
    }
    public Path read(String key) {
        if (key == null || !key.matches("[0-9a-f-]{36}\\.png"))
            throw new ResourceNotFoundException("Không tìm thấy ảnh đại diện");
        Path path = Path.of(storageRoot).toAbsolutePath().normalize().resolve(key);
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
            throw new ResourceNotFoundException("Không tìm thấy ảnh đại diện");
        return path;
    }
}
