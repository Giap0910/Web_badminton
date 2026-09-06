package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.dto.RacketComparisonResponse;
import com.sports.entity.Category;
import com.sports.entity.Product;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.CategoryRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.ProductSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewService reviewService;

    public List<ProductDto> getProducts(
            String keyword,
            String brand,
            String weightGrip,
            String balancePoint,
            String stiffness,
            String playStyle,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long categoryId
    ) {
        Specification<Product> spec = ProductSpecification.filterProducts(
                keyword, brand, weightGrip, balancePoint, stiffness, playStyle, minPrice, maxPrice, categoryId
        );
        return productRepository.findAll(spec).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ProductDto getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        return toDto(product);
    }

    public RacketComparisonResponse compareRackets(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty() || productIds.size() > 3) {
            throw new BadRequestException("Vui lòng chọn từ 1 đến tối đa 3 cây vợt để so sánh thông số");
        }

        List<ProductDto> rackets = productIds.stream()
                .map(this::getProductById)
                .collect(Collectors.toList());

        List<String> attributes = Arrays.asList(
                "Thương hiệu",
                "Giá niêm yết",
                "Trọng lượng & Chu vi cán (Weight / Grip)",
                "Độ cứng thân vợt (Stiffness)",
                "Điểm cân bằng (Balance Point)",
                "Sức căng tối đa (Max Tension)",
                "Phong cách chơi đề xuất (Play Style)",
                "Tồn kho khả dụng (Available Stock)"
        );

        return RacketComparisonResponse.builder()
                .rackets(rackets)
                .comparisonAttributes(attributes)
                .build();
    }

    @Transactional
    public ProductDto createProduct(ProductDto dto) {
        Category category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        }

        Product product = Product.builder()
                .name(dto.getName())
                .brand(dto.getBrand())
                .price(dto.getPrice())
                .originalPrice(dto.getOriginalPrice() != null ? dto.getOriginalPrice() : dto.getPrice())
                .stock(dto.getStock() != null ? dto.getStock() : 0)
                .reservedStock(0)
                .imageUrl(dto.getImageUrl())
                .description(dto.getDescription())
                .weightGrip(dto.getWeightGrip())
                .stiffness(dto.getStiffness())
                .balancePoint(dto.getBalancePoint())
                .maxTension(dto.getMaxTension())
                .playStyle(dto.getPlayStyle())
                .category(category)
                .build();

        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductDto dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
            product.setCategory(category);
        }

        product.setName(dto.getName());
        product.setBrand(dto.getBrand());
        product.setPrice(dto.getPrice());
        product.setOriginalPrice(dto.getOriginalPrice());
        if (dto.getStock() != null) {
            product.setStock(dto.getStock());
        }
        product.setImageUrl(dto.getImageUrl());
        product.setDescription(dto.getDescription());
        product.setWeightGrip(dto.getWeightGrip());
        product.setStiffness(dto.getStiffness());
        product.setBalancePoint(dto.getBalancePoint());
        product.setMaxTension(dto.getMaxTension());
        product.setPlayStyle(dto.getPlayStyle());

        return toDto(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id);
        }
        productRepository.deleteById(id);
    }

    public ProductDto toDto(Product product) {
        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .brand(product.getBrand())
                .price(product.getPrice())
                .originalPrice(product.getOriginalPrice())
                .stock(product.getStock())
                .reservedStock(product.getReservedStock())
                .imageUrl(product.getImageUrl())
                .description(product.getDescription())
                .weightGrip(product.getWeightGrip())
                .stiffness(product.getStiffness())
                .balancePoint(product.getBalancePoint())
                .maxTension(product.getMaxTension())
                .playStyle(product.getPlayStyle())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .averageRating(reviewService.getAverageRating(product.getId()))
                .reviewCount(reviewService.getReviewCount(product.getId()))
                .build();
    }
}
