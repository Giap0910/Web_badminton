package com.sports.service;

import com.sports.entity.ProductBrand;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ProductImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductMediaService {
    private final ProductImageRepository images;
    private final ProductImageStorage storage;

    public record Asset(byte[] bytes, String contentType) {}

    @Transactional(readOnly = true)
    public Asset read(Long productId, String fileName) {
        if (productId == null || productId <= 0) throw missing();
        String url = "/api/media/products/" + productId + "/" + fileName;
        var image = images.findFirstByProductIdAndImageUrlAndRightsApprovedTrueAndModelVerifiedTrue(productId, url)
                .orElseThrow(this::missing);
        var product = image.getProduct();
        if (!Boolean.TRUE.equals(product.getCatalogVisible()) || !ProductBrand.isSupported(product.getBrand())) throw missing();
        byte[] bytes = storage.read(productId, fileName);
        String type = fileName.endsWith(".jpg") ? "image/jpeg" : fileName.endsWith(".png") ? "image/png" : "image/webp";
        return new Asset(bytes, type);
    }

    private ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Không tìm thấy ảnh sản phẩm đã duyệt");
    }
}
