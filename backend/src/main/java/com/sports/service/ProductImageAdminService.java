package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.dto.ProductGallerySlotDto;
import com.sports.entity.Product;
import com.sports.entity.ProductImage;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ProductImageRepository;
import com.sports.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ProductImageAdminService {
    private final ProductRepository products;
    private final ProductImageRepository images;
    private final ProductImageStorage storage;
    private final ProductService catalog;

    @Transactional(readOnly = true)
    public List<ProductGallerySlotDto> list(long productId) {
        products.findById(productId).orElseThrow(this::missing);
        return slots(productId);
    }

    @Transactional
    public List<ProductGallerySlotDto> replace(long productId, int position, MultipartFile file, boolean approved) {
        validatePosition(position);
        if (!approved) throw new BadRequestException("Xác nhận quyền sử dụng và ảnh đúng sản phẩm trước khi tải");
        Product product = products.findByIdForUpdate(productId).orElseThrow(this::missing);
        var stored = storage.storeUpload(productId, file);
        archiveSlot(productId, position);
        String url = "/api/media/products/" + productId + "/" + stored.fileName();
        images.saveAndFlush(ProductImage.builder().product(product).imageUrl(url).displayOrder(position)
                .rightsApproved(true).modelVerified(true).build());
        if (position == 1) product.setImageUrl(url);
        products.save(product);
        return slots(productId);
    }

    @Transactional(readOnly = true)
    public ProductMediaService.Asset preview(long productId, int position) {
        validatePosition(position);
        String url = list(productId).get(position - 1).url();
        if (url == null) throw missing();
        String fileName = url.substring(url.lastIndexOf('/') + 1);
        String type = fileName.endsWith(".jpg") ? "image/jpeg" : fileName.endsWith(".png") ? "image/png" : "image/webp";
        return new ProductMediaService.Asset(storage.read(productId, fileName), type);
    }

    @Transactional
    public ProductDto publish(long productId) {
        products.findByIdForUpdate(productId).orElseThrow(this::missing);
        if (slots(productId).stream().anyMatch(slot -> slot.url() == null))
            throw new BadRequestException("Cần tải đủ ảnh 1–2–3–4 trước khi công khai sản phẩm");
        return catalog.updateVisibility(productId, true);
    }

    private List<ProductGallerySlotDto> slots(long productId) {
        return ProductService.positionedGallerySlots(images.findByProductIdOrderByDisplayOrderAsc(productId));
    }

    private void archiveSlot(long productId, int position) {
        var previous = images.findByProductIdOrderByDisplayOrderAsc(productId).stream()
                .filter(image -> image.getDisplayOrder() == position).toList();
        previous.forEach(image -> image.setDisplayOrder(99));
        images.saveAll(previous);
    }

    private void validatePosition(int position) {
        if (position < 1 || position > 4) throw new BadRequestException("Vị trí ảnh phải từ 1 đến 4");
    }

    private ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Không tìm thấy sản phẩm hoặc ảnh sản phẩm");
    }
}
