package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.dto.ProductCatalogFilters;
import com.sports.dto.RacketComparisonResponse;
import com.sports.entity.Product;
import com.sports.entity.ProductBrand;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
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
import com.sports.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewService reviewService;
    private final com.sports.repository.ProductImageRepository productImageRepository;

    public List<ProductDto> getProducts(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId) {
        return getProducts(keyword, brand, weightGrip, balancePoint, stiffness, playStyle,
                minPrice, maxPrice, categoryId, "shop");
    }

    public List<ProductDto> getProducts(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId, String catalogScope) {
        return getProducts(keyword, brand, weightGrip, balancePoint, stiffness, playStyle,
                minPrice, maxPrice, categoryId, catalogScope, new ProductCatalogFilters());
    }

    public List<ProductDto> getProducts(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId, String catalogScope, ProductCatalogFilters filters) {
        var filter = ProductSpecification.filterProducts(keyword, brand, weightGrip,
                balancePoint, stiffness, playStyle, minPrice, maxPrice, categoryId)
                .and(ProductSpecification.catalogAttributes(filters));
        return productRepository.findAll(scopedFilter(filter, catalogScope)).stream()
                .map(this::toDto).toList();
    }

    public PageResponse<ProductDto> getProductsPaged(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId, int page, int size, String sortBy, String sortDir) {
        return getProductsPaged(keyword, brand, weightGrip, balancePoint, stiffness, playStyle,
                minPrice, maxPrice, categoryId, page, size, sortBy, sortDir, "shop");
    }

    public PageResponse<ProductDto> getProductsPaged(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId, int page, int size, String sortBy,
            String sortDir, String catalogScope) {
        return getProductsPaged(keyword, brand, weightGrip, balancePoint, stiffness, playStyle,
                minPrice, maxPrice, categoryId, page, size, sortBy, sortDir, catalogScope, new ProductCatalogFilters());
    }

    public PageResponse<ProductDto> getProductsPaged(String keyword, String brand, String weightGrip,
            String balancePoint, String stiffness, String playStyle, BigDecimal minPrice,
            BigDecimal maxPrice, Long categoryId, int page, int size, String sortBy,
            String sortDir, String catalogScope, ProductCatalogFilters filters) {
        var filter = ProductSpecification.filterProducts(keyword, brand, weightGrip,
                balancePoint, stiffness, playStyle, minPrice, maxPrice, categoryId)
                .and(ProductSpecification.catalogAttributes(filters));
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), productSort(sortBy, sortDir));
        Page<Product> result = productRepository.findAll(scopedFilter(filter, catalogScope), pageable);
        return PageResponse.<ProductDto>builder().content(result.getContent().stream().map(this::toDto).toList())
                .pageNo(result.getNumber()).pageSize(result.getSize()).totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages()).last(result.isLast()).build();
    }

    private Sort productSort(String sortBy, String sortDir) {
        String field = sortBy == null || sortBy.isBlank() ? "id" : sortBy;
        if (!java.util.Set.of("id", "name", "price", "brand", "stock", "sku", "originalPrice",
                "weightGrip", "weightClass", "stiffness", "balancePoint", "maxTension", "playStyle",
                "gender", "bagType", "capacity", "racketCapacity", "accessoryType", "origin").contains(field)) {
            throw new BadRequestException("Trường sắp xếp sản phẩm không hợp lệ");
        }
        Sort sort = "asc".equalsIgnoreCase(sortDir) ? Sort.by(field).ascending() : Sort.by(field).descending();
        return field.equals("id") ? sort : sort.and(Sort.by("id").ascending());
    }

    private Specification<Product> scopedFilter(Specification<Product> filter, String scope) {
        if ("shop".equalsIgnoreCase(scope)) return filter.and(ProductSpecification.shopCatalog());
        if (!"all".equalsIgnoreCase(scope)) throw new BadRequestException("catalogScope chỉ nhận shop hoặc all");
        requireAdministrator();
        return filter;
    }

    private void requireAdministrator() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean admin = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin) throw new AccessDeniedException("Chỉ ADMIN được quản trị catalog đầy đủ");
    }

    private java.util.Optional<Product> scopedProduct(Long id, String scope) {
        Specification<Product> byId = (root, query, cb) -> cb.equal(root.get("id"), id);
        return productRepository.findOne(scopedFilter(byId, scope));
    }

    public ProductDto getProductById(Long id) {
        return getProductById(id, "shop");
    }

    public ProductDto getProductById(Long id, String catalogScope) {
        return toDto(scopedProduct(id, catalogScope)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id)));
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
        validateStockAndPrice(dto);
        Product product = Product.builder().name(dto.getName()).brand(ProductBrand.canonicalName(dto.getBrand()))
                .sku(dto.getSku()).price(dto.getPrice())
                .originalPrice(dto.getOriginalPrice() != null ? dto.getOriginalPrice() : dto.getPrice())
                .stock(dto.getStock() != null ? dto.getStock() : 0).reservedStock(0)
                .imageUrl(dto.getImageUrl()).description(dto.getDescription()).build();
        applyCategory(product, dto);
        applySpecifications(product, dto);
        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductDto dto) {
        validateStockAndPrice(dto);
        Product product = productRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        validateStockSnapshot(product, dto);
        applyCategory(product, dto);
        applyDetails(product, dto);
        applySpecifications(product, dto);
        return toDto(productRepository.save(product));
    }

    private void applyCategory(Product product, ProductDto dto) {
        if (dto.getCategoryId() == null) return;
        product.setCategory(categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục")));
    }

    private void applyDetails(Product product, ProductDto dto) {
        if (dto.getSku() != null) product.setSku(dto.getSku());
        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getBrand() != null) product.setBrand(ProductBrand.canonicalName(dto.getBrand()));
        product.setPrice(dto.getPrice());
        if (dto.getOriginalPrice() != null) product.setOriginalPrice(dto.getOriginalPrice());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getImageUrl() != null) product.setImageUrl(dto.getImageUrl());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
    }

    private void applySpecifications(Product product, ProductDto dto) {
        applyRacketSpecifications(product, dto);
        applyClothingSpecifications(product, dto);
        applyBagAndAccessorySpecifications(product, dto);
    }

    private void applyRacketSpecifications(Product product, ProductDto dto) {
        if (dto.getWeightGrip() != null) product.setWeightGrip(dto.getWeightGrip());
        if (dto.getWeightClass() != null) product.setWeightClass(dto.getWeightClass());
        if (dto.getStiffness() != null) product.setStiffness(dto.getStiffness());
        if (dto.getBalancePoint() != null) product.setBalancePoint(dto.getBalancePoint());
        if (dto.getMaxTension() != null) product.setMaxTension(dto.getMaxTension());
        if (dto.getPlayStyle() != null) product.setPlayStyle(dto.getPlayStyle());
        if (dto.getFrameMaterial() != null) product.setFrameMaterial(dto.getFrameMaterial());
        if (dto.getShaftMaterial() != null) product.setShaftMaterial(dto.getShaftMaterial());
    }

    private void applyClothingSpecifications(Product product, ProductDto dto) {
        if (dto.getAvailableSizes() != null) product.setAvailableSizes(dto.getAvailableSizes());
        if (dto.getSoleType() != null) product.setSoleType(dto.getSoleType());
        if (dto.getCushionTechnology() != null) product.setCushionTechnology(dto.getCushionTechnology());
        if (dto.getUpperMaterial() != null) product.setUpperMaterial(dto.getUpperMaterial());
        if (dto.getGender() != null) product.setGender(dto.getGender());
        if (dto.getFabricType() != null) product.setFabricType(dto.getFabricType());
    }

    private void applyBagAndAccessorySpecifications(Product product, ProductDto dto) {
        if (dto.getBagType() != null) product.setBagType(dto.getBagType());
        if (dto.getCapacity() != null) product.setCapacity(dto.getCapacity());
        if (dto.getRacketCapacity() != null) product.setRacketCapacity(dto.getRacketCapacity());
        if (dto.getWaterproof() != null) product.setWaterproof(dto.getWaterproof());
        if (dto.getAccessoryType() != null) product.setAccessoryType(dto.getAccessoryType());
        if (dto.getQuantityPerPack() != null) product.setQuantityPerPack(dto.getQuantityPerPack());
        if (dto.getOrigin() != null) product.setOrigin(dto.getOrigin());
    }

    private void validateSpecifications(ProductDto dto) {
        if (dto.getBrand() != null && !ProductBrand.isSupported(dto.getBrand())) {
            throw new BadRequestException("Thương hiệu phải thuộc Yonex, Victor, Li-Ning, Mizuno, Kawasaki hoặc Fleet");
        }
        if (dto.getRacketCapacity() != null && dto.getRacketCapacity() < 0) {
            throw new BadRequestException("Sức chứa vợt không được âm");
        }
        if (dto.getAvailableSizes() == null) return;
        try {
            var sizes = new ObjectMapper().enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(dto.getAvailableSizes());
            if (sizes == null || !sizes.isArray()) throw new IllegalArgumentException();
            for (var size : sizes) {
                if (!size.isTextual() || size.asText().isBlank()) throw new IllegalArgumentException();
            }
        } catch (Exception exception) {
            throw new BadRequestException("availableSizes phải là chuỗi JSON array các kích cỡ không rỗng");
        }
    }

    private void validateStockSnapshot(Product product, ProductDto dto) {
        if (dto.getStock() == null) return;
        if (dto.getExpectedStock() == null || !dto.getExpectedStock().equals(product.getStock())) {
            throw new BadRequestException("Tồn kho đã thay đổi hoặc thiếu số liệu gốc. Vui lòng tải lại sản phẩm trước khi lưu");
        }
    }

    private void validateStockAndPrice(ProductDto dto) {
        validateSpecifications(dto);
        VndAmount.requireValid(dto.getPrice());
        if (dto.getOriginalPrice() != null) VndAmount.requireValid(dto.getOriginalPrice());
        if (dto.getName() != null && (dto.getName().isBlank() || dto.getName().length() > 200)
                || dto.getBrand() != null && (dto.getBrand().isBlank() || dto.getBrand().length() > 50)) {
            throw new BadRequestException("Tên hoặc thương hiệu không hợp lệ");
        }
        validateOriginalPrice(dto);
        if (dto.getStock() != null && dto.getStock() < 0) {
            throw new BadRequestException("Tồn kho không được âm");
        }
        if (dto.getPrice() == null || dto.getPrice().signum() <= 0) {
            throw new BadRequestException("Giá sản phẩm phải lớn hơn 0");
        }
    }

    private void validateOriginalPrice(ProductDto dto) {
        if (dto.getOriginalPrice() != null && (dto.getOriginalPrice().signum() < 0
                || dto.getPrice() != null && dto.getOriginalPrice().compareTo(dto.getPrice()) < 0)) {
            throw new BadRequestException("Giá gốc phải không nhỏ hơn giá bán");
        }
    }

    @Transactional
    public ProductDto updateVisibility(Long id, Boolean visible) {
        requireAdministrator();
        if (visible == null) throw new BadRequestException("Vui lòng chọn trạng thái hiển thị sản phẩm");
        Product product = productRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        if (visible && !ProductBrand.isSupported(product.getBrand())) {
            throw new BadRequestException("Không thể hiện sản phẩm ngoài sáu thương hiệu được phép");
        }
        product.setCatalogVisible(visible);
        return toDto(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        requireAdministrator();
        Product product = productRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        if (product.getReservedStock() > 0 || productRepository.countOrderReferences(id) > 0
                || productRepository.countReviewReferences(id) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Sản phẩm có lịch sử đơn hàng/đánh giá hoặc tồn giữ chỗ. Vui lòng dùng Ẩn sản phẩm.");
        }
        productImageRepository.deleteByProductId(id);
        productRepository.delete(product);
    }

    public List<String> getProductImages(Long productId) {
        return getProductImages(productId, "shop");
    }

    public List<String> getProductImages(Long productId, String catalogScope) {
        var product = scopedProduct(productId, catalogScope);
        if (product.isEmpty()) {
            if (productRepository.existsById(productId)) {
                throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
            }
            return List.of();
        }
        List<String> images = productImageRepository.findByProductIdOrderByDisplayOrderAsc(productId).stream()
                .map(com.sports.entity.ProductImage::getImageUrl).toList();
        if (images.isEmpty() && product.get().getImageUrl() != null) return List.of(product.get().getImageUrl());
        return images;
    }

    public ProductDto toDto(Product product) {
        var builder = productDetails(product);
        addRacketDto(builder, product);
        addClothingDto(builder, product);
        addBagAndAccessoryDto(builder, product);
        List<String> images = productImageRepository.findByProductIdOrderByDisplayOrderAsc(product.getId()).stream()
                .map(com.sports.entity.ProductImage::getImageUrl).toList();
        if (images.isEmpty() && product.getImageUrl() != null) images = List.of(product.getImageUrl());
        return builder.imageUrls(images).averageRating(reviewService.getAverageRating(product.getId()))
                .reviewCount(reviewService.getReviewCount(product.getId())).build();
    }

    private ProductDto.ProductDtoBuilder productDetails(Product product) {
        return ProductDto.builder().id(product.getId()).name(product.getName())
                .brand(ProductBrand.canonicalName(product.getBrand())).catalogVisible(product.getCatalogVisible())
                .price(product.getPrice()).originalPrice(product.getOriginalPrice()).stock(product.getStock())
                .reservedStock(product.getReservedStock()).imageUrl(product.getImageUrl())
                .description(product.getDescription()).sku(product.getSku())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null);
    }

    private void addRacketDto(ProductDto.ProductDtoBuilder builder, Product product) {
        builder.weightGrip(product.getWeightGrip()).weightClass(product.getWeightClass())
                .stiffness(product.getStiffness()).balancePoint(product.getBalancePoint())
                .maxTension(product.getMaxTension()).playStyle(product.getPlayStyle())
                .frameMaterial(product.getFrameMaterial()).shaftMaterial(product.getShaftMaterial());
    }

    private void addClothingDto(ProductDto.ProductDtoBuilder builder, Product product) {
        builder.availableSizes(product.getAvailableSizes()).soleType(product.getSoleType())
                .cushionTechnology(product.getCushionTechnology()).upperMaterial(product.getUpperMaterial())
                .gender(product.getGender()).fabricType(product.getFabricType());
    }

    private void addBagAndAccessoryDto(ProductDto.ProductDtoBuilder builder, Product product) {
        builder.bagType(product.getBagType()).capacity(product.getCapacity()).racketCapacity(product.getRacketCapacity())
                .waterproof(product.getWaterproof()).accessoryType(product.getAccessoryType())
                .quantityPerPack(product.getQuantityPerPack()).origin(product.getOrigin());
    }
}
