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

    public List<ProductDto> getSuggestions(String keyword) {
        String term = keyword == null ? "" : keyword.trim().toLowerCase(java.util.Locale.ROOT);
        if (term.length() < 2 || term.length() > 200) return List.of();
        return productRepository.findAll(ProductSpecification.shopCatalog()).stream()
                .filter(p -> suggestionRank(p, term) < 5)
                .sorted(java.util.Comparator.<Product>comparingInt(p -> suggestionRank(p, term))
                        .thenComparing(p -> suggestionModel(p, term))
                        .thenComparing(Product::getId, java.util.Comparator.reverseOrder()))
                .limit(6).map(this::toDto).toList();
    }

    private String suggestionModel(Product product, String term) {
        if (!term.matches("[0-9]+")) return "";
        var matcher = java.util.regex.Pattern.compile("[0-9]+[\\p{L}\\p{N}]*")
                .matcher(product.getName().toLowerCase(java.util.Locale.ROOT));
        String model = "~";
        while (matcher.find()) {
            String token = matcher.group();
            if (token.startsWith(term) && token.compareTo(model) < 0) model = token;
        }
        return model;
    }

    private int suggestionRank(Product product, String term) {
        String name = product.getName().toLowerCase(java.util.Locale.ROOT);
        if (name.equals(term)) return 0;
        String boundary = term.matches("[0-9]+") ? "(?:^|[^0-9])" : "(?:^|[^\\p{L}\\p{N}])";
        if (java.util.regex.Pattern.compile(boundary + java.util.regex.Pattern.quote(term)).matcher(name).find()) return 1;
        if (name.contains(term)) return 2;
        if (product.getSku() != null && product.getSku().toLowerCase(java.util.Locale.ROOT).contains(term)) return 3;
        String brand = ProductBrand.canonicalName(term);
        return product.getBrand().toLowerCase(java.util.Locale.ROOT).contains(term)
                || brand != null && brand.equals(ProductBrand.canonicalName(product.getBrand())) ? 4 : 5;
    }

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
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)), productSort(sortBy, sortDir));
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
        if (productIds == null || productIds.isEmpty() || productIds.size() > 3
                || productIds.stream().anyMatch(id -> id == null || id <= 0)
                || new java.util.HashSet<>(productIds).size() != productIds.size()) {
            throw new BadRequestException("Vui lòng chọn từ 1 đến tối đa 3 cây vợt để so sánh thông số");
        }

        List<ProductDto> rackets = productIds.stream()
                .map(this::getProductById)
                .collect(Collectors.toList());
        if (rackets.stream().anyMatch(product -> !java.util.Objects.equals(product.getCategoryId(), 1L)))
            throw new BadRequestException("Chỉ có thể so sánh sản phẩm thuộc danh mục vợt cầu lông");

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
                .sku(dto.getSku()).price(dto.getPrice()).arrivedAt(java.time.LocalDateTime.now())
                .originalPrice(dto.getOriginalPrice() != null ? dto.getOriginalPrice() : dto.getPrice())
                .stock(dto.getStock() != null ? dto.getStock() : 0).reservedStock(0)
                .imageUrl(dto.getImageUrl()).description(dto.getDescription()).build();
        applyCategory(product, dto);
        applySpecifications(product, dto);
        Product saved = productRepository.save(product);
        assignSku(saved, dto.getSku());
        ProductVariantService.initialize(saved, dto);
        productRepository.saveAndFlush(saved);
        return toDto(saved);
    }

    private void assignSku(Product product, String supplied) {
        String category = switch (product.getCategory() == null ? 0 : product.getCategory().getId().intValue()) {
            case 1 -> "RACKET"; case 2 -> "SHOE"; case 3 -> "APPAREL"; case 4 -> "BAG"; case 5 -> "ACCESSORY"; default -> "PRODUCT";
        };
        String prefix="HG-"+category+"-";
        if (supplied != null && supplied.toUpperCase(java.util.Locale.ROOT).startsWith(prefix)) {
            product.setSku(supplied.toUpperCase(java.util.Locale.ROOT));return;
        }
        if (supplied != null && !supplied.isBlank() && product.getLegacySku() == null) product.setLegacySku(supplied);
        product.setSku(prefix+String.format(java.util.Locale.ROOT,"%03d",product.getId()));
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductDto dto) {
        validateStockAndPrice(dto);
        Product product = productRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        validateStockSnapshot(product, dto);
        validateVariantMetadata(product,dto);
        applyCategory(product, dto);
        applyDetails(product, dto);
        applySpecifications(product, dto);
        if (!product.getVariants().isEmpty()) ProductVariantService.refreshCatalog(product);
        return toDto(productRepository.save(product));
    }

    private void validateVariantMetadata(Product product,ProductDto dto) {
        if (dto.getVariants()!=null) throw new BadRequestException("Hãy quản lý từng biến thể bằng API biến thể, không thay thế qua sản phẩm cha");
        if (product.getVariants().isEmpty()) return;
        Long category=product.getCategory()==null ? null : product.getCategory().getId();
        if (dto.getCategoryId()!=null && !java.util.Objects.equals(category,dto.getCategoryId()))
            throw new BadRequestException("Không đổi danh mục khi đã có biến thể. Hãy tạo sản phẩm đúng danh mục và giữ lịch sử");
        requireSameChoice(dto.getColorName(),product.getColorName(),"Màu sắc");
        if (java.util.Objects.equals(category,1L)) requireSameChoice(dto.getWeightGrip(),product.getWeightGrip(),"Trọng lượng/cỡ cán");
        if (java.util.Objects.equals(category,5L)) requireSameChoice(dto.getQuantityPerPack(),product.getQuantityPerPack(),"Quy cách");
        if (java.util.Objects.equals(category,2L) || java.util.Objects.equals(category,3L)) {
            if (dto.getAvailableSizes()!=null && !sameSizes(dto.getAvailableSizes(),product.getAvailableSizes()))
                throw new BadRequestException("Kích cỡ lấy từ từng biến thể; hãy thêm hoặc bật/tắt biến thể tương ứng");
        }
    }

    private void requireSameChoice(String requested,String current,String label) {
        if (requested!=null && !java.util.Objects.equals(requested.trim(),current==null ? null : current.trim()))
            throw new BadRequestException(label+" lấy từ từng biến thể; hãy thêm hoặc bật/tắt biến thể tương ứng");
    }

    private boolean sameSizes(String requested,String current) {
        try {
            var mapper=new ObjectMapper();
            var before=mapper.readTree(current==null ? "[]" : current);var after=mapper.readTree(requested);
            return before.equals(after);
        } catch(Exception ex) { return java.util.Objects.equals(requested,current); }
    }

    private void applyCategory(Product product, ProductDto dto) {
        if (dto.getCategoryId() == null) return;
        product.setCategory(categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục")));
    }

    private void applyDetails(Product product, ProductDto dto) {
        if (dto.getSku() != null) assignSku(product, dto.getSku());
        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getBrand() != null) product.setBrand(ProductBrand.canonicalName(dto.getBrand()));
        product.setPrice(dto.getPrice());
        if (dto.getOriginalPrice() != null) product.setOriginalPrice(dto.getOriginalPrice());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getImageUrl() != null) product.setImageUrl(dto.getImageUrl());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
    }

    private void applySpecifications(Product product, ProductDto dto) {
        applyPresentation(product, dto);
        applyRacketSpecifications(product, dto);
        applyClothingSpecifications(product, dto);
        applyBagAndAccessorySpecifications(product, dto);
    }

    private void applyPresentation(Product product, ProductDto dto) {
        if (dto.getManufacturerCode() != null) product.setManufacturerCode(dto.getManufacturerCode());
        if (dto.getColorName() != null) product.setColorName(dto.getColorName());
        if (dto.getEdition() != null) product.setEdition(dto.getEdition());
        if (dto.getArrivedAt() != null) product.setArrivedAt(dto.getArrivedAt());
        if (dto.getSpecificationSource() != null) product.setSpecificationSource(dto.getSpecificationSource());
    }

    static boolean recentlyArrived(java.time.LocalDateTime arrivedAt, java.time.LocalDateTime now) {
        return arrivedAt != null && !arrivedAt.isAfter(now) && arrivedAt.plusDays(14).isAfter(now);
    }

    static List<String> benefits(Long categoryId) {
        if (categoryId == null || categoryId == 5) return List.of();
        var offers = new java.util.ArrayList<String>();
        if (categoryId == 1) offers.addAll(List.of("Tặng quấn cán vợt cầu lông", "Tặng bao nhung bảo vệ vợt"));
        offers.add("Bảo hành 1 đổi 1 trong 90 ngày theo chính sách cửa hàng");
        offers.add("Tích điểm theo số tiền đã thanh toán; 1 điểm đổi 100 đồng cho đơn tiếp theo");
        return List.copyOf(offers);
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
        if (!product.getVariants().isEmpty() && !dto.getStock().equals(product.getStock())) {
            throw new BadRequestException("Hãy cập nhật tồn kho theo từng biến thể, không sửa tổng tồn trực tiếp");
        }
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
        if (product.getReservedStock() > 0 || productRepository.countActiveOrderReferences(id) > 0
                || productRepository.countActiveReturns(id) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Sản phẩm đang có đơn chưa hoàn tất, yêu cầu đổi trả đang xử lý hoặc hàng giữ chỗ. Chỉ được xóa sau khi hoàn tất.");
        }
        productRepository.detachOrderHistory(id);
        productRepository.detachReviewHistory(id);
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
        return approvedImages(productImageRepository.findByProductIdOrderByDisplayOrderAsc(productId));
    }

    public ProductDto toDto(Product product) {
        var builder = productDetails(product);
        addRacketDto(builder, product);
        addClothingDto(builder, product);
        addBagAndAccessoryDto(builder, product);
        List<String> images = new java.util.ArrayList<>(approvedImages(productImageRepository.findByProductIdOrderByDisplayOrderAsc(product.getId())));
        if (images.remove(product.getImageUrl())) images.add(0,product.getImageUrl());
        return builder.imageUrl(images.isEmpty() ? null : images.get(0)).imageUrls(images).imageSlots(gallerySlots(images))
                .averageRating(reviewService.getAverageRating(product.getId()))
                .variants(ProductVariantService.describe(product)).inStock(product.getStock() != null && product.getStock() > 0)
                .reviewCount(reviewService.getReviewCount(product.getId())).build();
    }

    static List<String> approvedImages(List<com.sports.entity.ProductImage> images) {
        return images.stream().filter(i -> Boolean.TRUE.equals(i.getRightsApproved()) && Boolean.TRUE.equals(i.getModelVerified()))
                .map(com.sports.entity.ProductImage::getImageUrl).filter(ProductService::internalImage).distinct().limit(4).toList();
    }
    static boolean internalImage(String url) {
        return url != null && url.matches("/api/media/products/[0-9]+/[a-zA-Z0-9-]+\\.(jpg|png|webp)");
    }
    static List<com.sports.dto.ProductGallerySlotDto> gallerySlots(List<String> images) {
        return java.util.stream.IntStream.range(0,4).mapToObj(index -> new com.sports.dto.ProductGallerySlotDto(index+1,
                index<images.size() ? images.get(index) : null,index<images.size() ? "READY" : "UPDATING")).toList();
    }

    private ProductDto.ProductDtoBuilder productDetails(Product product) {
        return ProductDto.builder().id(product.getId()).name(product.getName())
                .brand(ProductBrand.canonicalName(product.getBrand())).catalogVisible(product.getCatalogVisible())
                .price(product.getPrice()).originalPrice(product.getOriginalPrice()).stock(product.getStock())
                .reservedStock(product.getReservedStock()).imageUrl(product.getImageUrl())
                .description(product.getDescription()).sku(product.getSku())
                .manufacturerCode(product.getManufacturerCode()).colorName(product.getColorName())
                .edition(product.getEdition()).arrivedAt(product.getArrivedAt())
                .specificationSource(product.getSpecificationSource())
                .isNew(recentlyArrived(product.getArrivedAt(), java.time.LocalDateTime.now()))
                .benefits(benefits(product.getCategory() == null ? null : product.getCategory().getId()))
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
