package com.sports.service;

import com.sports.repository.BannerImageRepository;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class BannerService {
    private final BannerImageRepository banners;
    private final ProductImageStorage storage;
    public record Slot(int position, String url, String status) {}

    public BannerService(BannerImageRepository banners,
            @Value("${app.banner-images.storage-root:storage/banners}") String root) {
        this.banners = banners;
        this.storage = new ProductImageStorage(root);
    }

    @Transactional(readOnly = true)
    public List<Slot> list() {
        var rows = banners.findAll();
        return java.util.stream.IntStream.rangeClosed(1, 4).mapToObj(position -> {
            String url = rows.stream().filter(row -> row.getPosition() == position)
                    .map(com.sports.entity.BannerImage::getImageUrl).filter(value -> validUrl(position, value))
                    .findFirst().orElse(null);
            return new Slot(position, url, url == null ? "UPDATING" : "READY");
        }).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Slot replace(int position, MultipartFile file, boolean approved) {
        validatePosition(position);
        if (!approved) throw new BadRequestException("Xác nhận quyền sử dụng ảnh banner trước khi tải");
        var banner = banners.findByPositionForUpdate(position).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa khởi tạo vị trí banner trong database"));
        var stored = storage.storeUpload(position, file);
        String url = "/api/media/banners/" + position + "/" + stored.fileName();
        banner.setImageUrl(url);
        banners.saveAndFlush(banner);
        return new Slot(position, url, "READY");
    }

    @Transactional(readOnly = true)
    public ProductMediaService.Asset read(int position, String fileName) {
        validatePosition(position);
        String url = "/api/media/banners/" + position + "/" + fileName;
        if (!validUrl(position, url)) throw missing();
        banners.findById(position).filter(row -> url.equals(row.getImageUrl())).orElseThrow(this::missing);
        byte[] bytes = storage.read(position, fileName);
        return new ProductMediaService.Asset(bytes, fileName.endsWith(".jpg") ? "image/jpeg" : "image/png");
    }

    private boolean validUrl(int position, String url) {
        return url != null && url.matches("/api/media/banners/" + position + "/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.(jpg|png)");
    }

    private void validatePosition(int position) {
        if (position < 1 || position > 4) throw new BadRequestException("Vị trí banner phải từ 1 đến 4");
    }

    private ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Không tìm thấy ảnh banner đang sử dụng");
    }
}
