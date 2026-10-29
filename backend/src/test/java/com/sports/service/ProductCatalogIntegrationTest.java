package com.sports.service;

import com.sports.dto.ProductDto;
import com.sports.dto.ProductCatalogFilters;
import com.sports.controller.ProductController;
import com.sports.exception.GlobalExceptionHandler;
import com.sports.entity.Product;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfSystemProperty(named = "product.catalog.mysql", matches = "true")
class ProductCatalogIntegrationTest {
    private static AnnotationConfigApplicationContext context;
    private ProductService service;
    private ProductRepository products;
    private TransactionTemplate tx;
    private static final Map<Integer, List<String>> FIELDS = Map.of(
            1, List.of("weightGrip", "weightClass", "stiffness", "balancePoint", "maxTension", "playStyle", "frameMaterial", "shaftMaterial"),
            2, List.of("availableSizes", "soleType", "cushionTechnology", "upperMaterial", "gender"),
            3, List.of("availableSizes", "gender", "fabricType"),
            4, List.of("bagType", "capacity", "racketCapacity", "waterproof"),
            5, List.of("accessoryType", "quantityPerPack", "origin"));

    @BeforeAll
    static void start() {
        context = new AnnotationConfigApplicationContext(Config.class);
    }

    @AfterAll
    static void stop() {
        if (context != null) context.close();
        SecurityContextHolder.clearContext();
    }

    @BeforeEach
    void prepare() {
        service = context.getBean(ProductService.class);
        products = context.getBean(ProductRepository.class);
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publicCatalogFiltersBeforePaginationAndPreservesDatabaseRows() {
        var page = service.getProductsPaged(null, null, null, null, null, null, null, null, null, 0, 12, "id", "desc");
        assertEquals(110, page.getTotalElements());
        assertEquals(10, page.getTotalPages());
        assertEquals(12, page.getContent().size());
        assertFalse(page.getContent().stream().anyMatch(p -> Set.of(236L, 237L, 31L).contains(p.getId())));
        assertEquals(124, products.count());
    }

    @ParameterizedTest
    @ValueSource(ints={-1,0,100,101,Integer.MAX_VALUE})
    void pageSizesRemainWithinOneToOneHundredWithoutChangingCatalogScope(int requestedSize) {
        var page=service.getProductsPaged(null,null,null,null,null,null,null,null,null,-1,requestedSize,"id","asc");
        int expected=Math.max(1,Math.min(100,requestedSize));
        assertEquals(expected,page.getPageSize());assertEquals(0,page.getPageNo());
        assertEquals(expected,page.getContent().size());assertEquals(110,page.getTotalElements());
        assertEquals(124,products.count());
        assertFalse(page.getContent().stream().anyMatch(product->Set.of(236L,237L,31L).contains(product.getId())));
    }

    @Test
    void bothLiNingAliasesReturnSameProductsAndCanonicalName() {
        var legacy = service.getProducts(null, "Lining", null, null, null, null, null, null, null);
        var canonical = service.getProducts(null, "Li-Ning", null, null, null, null, null, null, null);
        assertEquals(24, legacy.size());
        assertEquals(legacy.stream().map(ProductDto::getId).sorted().toList(),
                canonical.stream().map(ProductDto::getId).sorted().toList());
        assertTrue(legacy.stream().allMatch(p -> p.getBrand().equals("Li-Ning")));
        assertEquals(24, service.getProducts("Lining", null, null, null, null, null, null, null, null).size());
        assertEquals(24, service.getProducts("Li-Ning", null, null, null, null, null, null, null, null).size());
    }

    @Test
    void hiddenProductCannotBeReadThroughDetailsGalleryOrComparison() {
        for (long id : new long[]{31, 236, 237}) {
            assertThrows(ResourceNotFoundException.class, () -> service.getProductById(id));
            assertThrows(ResourceNotFoundException.class, () -> service.getProductImages(id));
            assertThrows(ResourceNotFoundException.class, () -> service.compareRackets(List.of(id)));
        }
        assertEquals(List.of(), service.getProductImages(Long.MAX_VALUE));
        assertEquals(ProductService.approvedImages(context.getBean(ProductImageRepository.class)
                .findByProductIdOrderByDisplayOrderAsc(1L)),service.getProductImages(1L));
    }

    @Test void publicSuggestionHttpMatchesVietnameseWithOrWithoutAccentsAndKeepsStockPrivate() throws Exception {
        var mvc = standaloneSetup(new ProductController(service, context.getBean(ProductVariantService.class)))
                .setControllerAdvice(new com.sports.exception.GlobalExceptionHandler()).build();
        for (var terms : List.of(List.of("vot", "VỢT"), List.of("giay", "Giày"))) {
            var plain = service.getSuggestions(terms.get(0));
            var accented = service.getSuggestions(terms.get(1));
            assertFalse(plain.isEmpty()); assertTrue(plain.size() <= 6);
            assertEquals(plain.stream().map(ProductDto::getId).toList(), accented.stream().map(ProductDto::getId).toList());
            assertFalse(plain.stream().anyMatch(product -> Set.of(31L, 236L, 237L).contains(product.getId())));
            mvc.perform(get("/api/products/suggestions").param("keyword", terms.get(0)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(plain.size()))
                    .andExpect(jsonPath("$[0].id").value(plain.get(0).getId()))
                    .andExpect(jsonPath("$[0].stock").doesNotExist()).andExpect(jsonPath("$[0].reservedStock").doesNotExist());
        }
        assertEquals(124, products.count());
    }

    @Test
    void comparisonAcceptsSameCategoryAndSerializesNoStockCounts() throws Exception {
        var catalog=service.getProducts(null,null,null,null,null,null,null,null,null);
        var rackets=catalog.stream().filter(product->Objects.equals(product.getCategoryId(),1L)).limit(2).toList();
        var other=catalog.stream().filter(product->!Objects.equals(product.getCategoryId(),1L)).findFirst().orElseThrow();
        assertEquals(2,rackets.size());Long first=rackets.get(0).getId(),second=rackets.get(1).getId();
        assertThrows(BadRequestException.class,()->service.compareRackets(List.of(first,first)));
        assertThrows(BadRequestException.class,()->service.compareRackets(List.of(first,other.getId())));
        assertThrows(BadRequestException.class,()->service.compareRackets(Arrays.asList(first,null)));
        var response=service.compareRackets(List.of(second,first));
        assertEquals(List.of(second,first),response.getRackets().stream().map(ProductDto::getId).toList());
        var json=new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().valueToTree(response);
        for(var product:json.path("rackets")) {
            assertTrue(product.path("stock").isNull());assertTrue(product.path("reservedStock").isNull());
            for(var variant:product.path("variants")) assertTrue(variant.path("stock").isNull());
        }
        assertEquals(124,products.count());
    }

    @Test
    void completeCatalogRequiresAdministratorIncludingDetailsAndGallery() {
        assertThrows(AccessDeniedException.class, () -> allProducts());
        authenticate("ROLE_USER");
        assertThrows(AccessDeniedException.class, () -> service.getProductById(31L, "all"));
        assertThrows(AccessDeniedException.class, () -> service.getProductImages(31L, "all"));
        authenticate("ROLE_ADMIN");
        assertEquals(124, allProducts().size());
        assertEquals("Kumpoo", service.getProductById(31L, "all").getBrand());
        assertEquals(ProductService.approvedImages(context.getBean(ProductImageRepository.class)
                .findByProductIdOrderByDisplayOrderAsc(31L)),service.getProductImages(31L,"all"));
    }

    private List<ProductDto> allProducts() {
        return service.getProducts(null, null, null, null, null, null, null, null, null, "all");
    }

    private void authenticate(String authority) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "test", "test", List.of(new SimpleGrantedAuthority(authority))));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5})
    void createAndUpdatePersistSpecificationsAfterReloadForEachCategory(int category) {
        tx.executeWithoutResult(status -> {
            ProductDto create = fixture(category, "A");
            ProductDto saved = service.createProduct(create);
            reload();
            assertSpecifications(create, service.getProductById(saved.getId()), category);
            ProductDto update = fixture(category, "B");
            preserveVariantChoices(update,saved);
            update.setExpectedStock(saved.getStock());
            update.setSku(saved.getSku());
            service.updateProduct(saved.getId(), update);
            reload();
            var actual = service.getProductById(saved.getId());
            assertSpecifications(update, actual, category);
            assertEquals(0, actual.getReservedStock());
            assertTrue(actual.getCatalogVisible());
            status.setRollbackOnly();
        });
    }

    private void reload() {
        products.flush();
        SharedEntityManagerCreator.createSharedEntityManager(context.getBean(EntityManagerFactory.class)).clear();
    }

    @Test void excelCommitPersistsNormalizedVariantsOnIsolatedDatabaseAndRollsBack() throws Exception {
        var excel=new ProductExcelService(new com.fasterxml.jackson.databind.ObjectMapper());
        var bytes=importVariantWorkbook(excel);var importedIds=new ArrayList<Long>();
        assertEquals(124,products.count());authenticate("ROLE_ADMIN");
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var imports=new ProductImportService(excel,service,products,context.getBean(CategoryRepository.class),factory.getValidator());
            tx.executeWithoutResult(status->{
                status.setRollbackOnly();
                var preview=imports.preview(bytes);assertTrue(preview.valid(),preview.rows().toString());
                assertEquals(1,preview.total());assertImportPreviewChoices(preview.rows().get(0).product());
                importedIds.addAll(imports.commit(bytes,preview.sha256()).importedIds());
                assertEquals(1,importedIds.size());reload();
                assertPersistedImportChoices(products.findById(importedIds.get(0)).orElseThrow());
                assertEquals(125,products.count());
            });
        }
        assertEquals(124,products.count());assertFalse(products.existsById(importedIds.get(0)));
    }

    private byte[] importVariantWorkbook(ProductExcelService excel) throws java.io.IOException {
        try(var workbook=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(excel.template()));
                var output=new java.io.ByteArrayOutputStream()) {
            String sku="HG-ACCESSORY-"+UUID.randomUUID().toString().replace("-","");
            for(int index=1;index<=2;index++) {
                var row=workbook.getSheetAt(4).createRow(index);
                var values=Map.of("sku",sku,"name","Cước Yonex kiểm thử Excel","brand","Yonex","price","100000",
                        "catalogVisible","false","accessoryType","day_cuoc","quantityPerPack","10 m",
                        "variantColor",index==1 ? " Đỏ " : "Trắng","variantStock",index==1 ? "20" : "0");
                values.forEach((key,value)->row.createCell(ProductExcelService.HEADERS.indexOf(key)).setCellValue(value));
            }
            workbook.write(output);return output.toByteArray();
        }
    }

    private void assertImportPreviewChoices(ProductDto product) {
        var choices=product.getVariants();assertEquals(2,choices.size());
        assertEquals(List.of("Đỏ","Trắng"),choices.stream().map(com.sports.dto.ProductVariantDto::getColor).toList());
        assertEquals(List.of("10 m","10 m"),choices.stream().map(com.sports.dto.ProductVariantDto::getPackaging).toList());
        assertEquals(List.of(20,0),choices.stream().map(com.sports.dto.ProductVariantDto::getStock).toList());
        assertTrue(choices.stream().allMatch(choice->choice.getId()==null && choice.getSku()==null));
    }

    private void assertPersistedImportChoices(Product product) {
        assertNotNull(product.getId());assertFalse(product.getCatalogVisible());assertEquals(20,product.getStock());
        assertEquals(2,product.getVariants().size());
        assertEquals(List.of("Đỏ","Trắng"),product.getVariants().stream().map(com.sports.entity.ProductVariant::getColor).toList());
        assertEquals(List.of("10 m","10 m"),product.getVariants().stream().map(com.sports.entity.ProductVariant::getPackaging).toList());
        assertEquals(List.of(20,0),product.getVariants().stream().map(com.sports.entity.ProductVariant::getStock).toList());
        assertTrue(product.getVariants().stream().allMatch(variant->variant.getId()!=null && variant.getSku().startsWith(product.getSku()+"-V")));
        assertEquals(0,product.getReservedStock());assertTrue(product.getVariants().stream().allMatch(variant->variant.getReservedStock()==0));
    }

    private void preserveVariantChoices(ProductDto update,ProductDto saved) {
        update.setWeightGrip(saved.getWeightGrip());update.setAvailableSizes(saved.getAvailableSizes());
        update.setColorName(saved.getColorName());update.setQuantityPerPack(saved.getQuantityPerPack());
    }

    private String adminJson(ProductDto dto) throws com.fasterxml.jackson.core.JsonProcessingException {
        authenticate("ROLE_ADMIN");
        return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(dto);
    }

    @Test void galleriesRequireBothImageApprovalAndTheCorrectCatalogScope() {
        tx.executeWithoutResult(status->{
            var images=context.getBean(ProductImageRepository.class);
            var visible=products.findById(1L).orElseThrow();var hidden=products.findById(31L).orElseThrow();
            String visibleUrl="/api/media/products/1/approved-test.jpg",hiddenUrl="/api/media/products/31/approved-test.jpg";
            images.saveAndFlush(com.sports.entity.ProductImage.builder().product(visible).imageUrl(visibleUrl)
                    .displayOrder(1).rightsApproved(true).modelVerified(true).build());
            images.saveAndFlush(com.sports.entity.ProductImage.builder().product(visible)
                    .imageUrl("/api/media/products/1/unapproved-test.jpg").rightsApproved(false).modelVerified(true).build());
            images.saveAndFlush(com.sports.entity.ProductImage.builder().product(hidden).imageUrl(hiddenUrl)
                    .displayOrder(1).rightsApproved(true).modelVerified(true).build());
            reload();
            assertTrue(service.getProductImages(1L).contains(visibleUrl));
            assertFalse(service.getProductImages(1L).contains("/api/media/products/1/unapproved-test.jpg"));
            assertThrows(ResourceNotFoundException.class,()->service.getProductImages(31L));
            authenticate("ROLE_ADMIN");assertTrue(service.getProductImages(31L,"all").contains(hiddenUrl));
            status.setRollbackOnly();
        });
    }

    private ProductDto fixture(int category, String version) {
        ProductDto dto = ProductDto.builder().name("Sản phẩm kiểm thử " + version).brand(" Lining ")
                .sku("CATALOG-TEST-" + UUID.randomUUID()).price(new BigDecimal("100000"))
                .stock(7).categoryId((long) category).build();
        var properties = new BeanWrapperImpl(dto);
        for (String field : FIELDS.get(category)) {
            Object value = field.equals("racketCapacity") ? 6
                    : field.equals("availableSizes") ? "[\"39\",\"40\"]" : "Kiểm thử " + version;
            properties.setPropertyValue(field, value);
        }
        return dto;
    }

    private void assertSpecifications(ProductDto expected, ProductDto actual, int category) {
        var before = new BeanWrapperImpl(expected);
        var after = new BeanWrapperImpl(actual);
        assertEquals("Li-Ning", actual.getBrand());
        assertEquals((long) category, actual.getCategoryId());
        for (String field : FIELDS.get(category)) {
            assertEquals(before.getPropertyValue(field), after.getPropertyValue(field), field);
        }
    }

    @Test
    void omittedSpecificationsArePreservedAndStaleStockIsRejected() {
        tx.executeWithoutResult(status -> {
            var saved = service.createProduct(fixture(2, "A"));
            var update = ProductDto.builder().name(saved.getName()).brand(saved.getBrand()).price(saved.getPrice()).build();
            service.updateProduct(saved.getId(), update);
            reload();
            assertEquals(saved.getUpperMaterial(), service.getProductById(saved.getId()).getUpperMaterial());
            update.setStock(8);
            update.setExpectedStock(999);
            assertThrows(BadRequestException.class, () -> service.updateProduct(saved.getId(), update));
            assertEquals(7, products.findById(saved.getId()).orElseThrow().getStock());
            status.setRollbackOnly();
        });
    }

    @Test
    void invalidBrandSizesScopeAndSortAreRejected() {
        var dto = fixture(1, "A");
        dto.setBrand("Kumpoo");
        assertThrows(BadRequestException.class, () -> service.createProduct(dto));
        dto.setBrand("Yonex");
        for (String sizes : List.of("{}", "[39]", "[\"\"]", "[\"39\"]{}")) {
            dto.setAvailableSizes(sizes);
            assertThrows(BadRequestException.class, () -> service.createProduct(dto));
        }
        assertThrows(BadRequestException.class, () -> service.getProductById(1L, "invalid"));
        assertThrows(BadRequestException.class, () -> service.getProductsPaged(
                null, null, null, null, null, null, null, null, null, 0, 12, "unknown", "asc"));
    }

    @Test
    void exactSizesAndGenderAreFilteredBeforePagingIncludingNonArrayLegacyJson() {
        tx.executeWithoutResult(status -> {
            String keyword = "FILTER6-" + UUID.randomUUID();
            var first = filterFixture(keyword, "[\"40\"]", "Nam", true);
            filterFixture(keyword, "[\"40.5\"]", "Nữ", false);
            filterFixture(keyword, "[\"39\",\"41\"]", "Unisex", true);
            var second = filterFixture(keyword, "[\"40\"]", "Unisex", true);
            var invalid = products.findById(filterFixture(keyword, "[\"40\"]", "Nam", true).getId()).orElseThrow();
            invalid.setAvailableSizes("{\"legacy\":\"40\"}");
            products.saveAndFlush(invalid);
            var filters = ProductCatalogFilters.builder().productSize("40").gender("Nam").sale(true).build();
            var page0 = filteredPage(keyword, filters, 0, 1);
            var page1 = filteredPage(keyword, filters, 1, 1);
            assertEquals(2, page0.getTotalElements());
            assertEquals(2, page0.getTotalPages());
            assertEquals(List.of(first.getId(), second.getId()), List.of(page0.getContent().get(0).getId(), page1.getContent().get(0).getId()));
            assertEquals(1, filteredPage(keyword, ProductCatalogFilters.builder().productSize("40.5").build(), 0, 12).getTotalElements());
            status.setRollbackOnly();
        });
    }

    private ProductDto filterFixture(String keyword, String sizes, String gender, boolean sale) {
        var dto = fixture(2, keyword);
        dto.setAvailableSizes(sizes);
        dto.setGender(gender);
        dto.setOriginalPrice(sale ? new BigDecimal("120000") : dto.getPrice());
        return service.createProduct(dto);
    }

    private com.sports.dto.PageResponse<ProductDto> filteredPage(String keyword,
            ProductCatalogFilters filters, int page, int size) {
        return service.getProductsPaged(keyword, null, null, null, null, null,
                null, null, null, page, size, "price", "asc", "shop", filters);
    }

    @Test
    void categoryAttributesAndSaleUseRealColumnsAcrossAllPages() {
        var all = service.getProducts(null, null, null, null, null, null, null, null, null);
        for (String type : List.of("day_cuoc", "quan_can", "qua_cau", "bang_do")) {
            var filters = ProductCatalogFilters.builder().accessoryType(type).build();
            long expected = all.stream().filter(p -> type.equals(p.getAccessoryType())).count();
            assertEquals(expected, filteredPage(null, filters, 0, 1).getTotalElements());
        }
        for (String type : List.of("balo", "tui_holdall")) {
            long expected = all.stream().filter(p -> type.equals(p.getBagType())).count();
            assertEquals(expected, filteredPage(null, ProductCatalogFilters.builder().bagType(type).build(), 0, 1).getTotalElements());
        }
        long capacity = all.stream().filter(p -> Integer.valueOf(9).equals(p.getRacketCapacity())).count();
        assertEquals(capacity, filteredPage(null, ProductCatalogFilters.builder().racketCapacity(9).build(), 0, 1).getTotalElements());
        long sale = all.stream().filter(p -> p.getOriginalPrice() != null && p.getPrice().signum() > 0
                && p.getOriginalPrice().compareTo(p.getPrice()) > 0).count();
        assertEquals(sale, filteredPage(null, ProductCatalogFilters.builder().sale(true).build(), 0, 1).getTotalElements());
        assertEquals(all.size(), filteredPage(null, ProductCatalogFilters.builder().sale(false).build(), 0, 1).getTotalElements());
    }

    @Test
    void httpBindsOptionalFiltersValidatesInputAndKeepsScopeSecurity() throws Exception {
        var mvc = standaloneSetup(new ProductController(service, mock(ProductVariantService.class))).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/products").param("page", "0").param("size", "1").param("accessoryType", "qua_cau"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].accessoryType").value("qua_cau"));
        mvc.perform(get("/api/products").param("productSize", "40.5").param("categoryId", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].categoryId").value(2));
        mvc.perform(get("/api/products").param("keyword", "SHO-017"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/products").param("keyword", service.getProductById(51L).getName()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(51));
        mvc.perform(get("/api/products").param("racketCapacity", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/products").param("racketCapacity", "invalid")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/products").param("productSize", "x".repeat(101))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/products").param("sale", "invalid")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/products").param("catalogScope", "all").param("productSize", "40"))
                .andExpect(status().isForbidden());
    }

    @Test
    void visibilityRoundTripPreservesStockImagesAndExistingOrders() {
        tx.executeWithoutResult(status -> {
            authenticate("ROLE_ADMIN");
            var before = service.getProductById(1L, "all");
            var images = service.getProductImages(1L, "all");
            var jdbc = new org.springframework.jdbc.core.JdbcTemplate(context.getBean(DataSource.class));
            long orders = jdbc.queryForObject("SELECT COUNT(*) FROM order_items WHERE product_id=1", Long.class);
            assertFalse(service.updateVisibility(1L, false).getCatalogVisible());
            reload();
            assertThrows(ResourceNotFoundException.class, () -> service.getProductById(1L));
            assertEquals(109, service.getProducts(null, null, null, null, null, null, null, null, null).size());
            assertEquals(124, allProducts().size());
            assertEquals(before.getStock(), service.getProductById(1L, "all").getStock());
            assertEquals(before.getReservedStock(), service.getProductById(1L, "all").getReservedStock());
            assertEquals(images, service.getProductImages(1L, "all"));
            assertEquals(orders, jdbc.queryForObject("SELECT COUNT(*) FROM order_items WHERE product_id=1", Long.class));
            assertFalse(service.updateVisibility(1L, false).getCatalogVisible());
            assertTrue(service.updateVisibility(1L, true).getCatalogVisible());
            reload();
            assertEquals(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(before),
                    new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(service.getProductById(1L, "all")));
            assertEquals(110, service.getProducts(null, null, null, null, null, null, null, null, null).size());
            status.setRollbackOnly();
        });
    }

    @Test
    void visibilityRequiresAdminAndRejectsUnsupportedBrandsOrMissingValues() {
        assertThrows(AccessDeniedException.class, () -> service.updateVisibility(1L, false));
        authenticate("ROLE_USER");
        assertThrows(AccessDeniedException.class, () -> service.updateVisibility(1L, false));
        tx.executeWithoutResult(status -> {
            authenticate("ROLE_ADMIN");
            assertThrows(BadRequestException.class, () -> service.updateVisibility(1L, null));
            assertThrows(BadRequestException.class, () -> service.updateVisibility(31L, true));
            assertThrows(ResourceNotFoundException.class, () -> service.updateVisibility(Long.MAX_VALUE, false));
            assertFalse(service.getProductById(31L, "all").getCatalogVisible());
            status.setRollbackOnly();
        });
    }

    @Test
    void actualSecurityChainProtectsVisibilityAndValidatesBody() throws Exception {
        try (var web = productWebContext()) {
            var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            mvc.perform(patch("/api/products/1/visibility").contentType("application/json").content("{\"catalogVisible\":false}"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(patch("/api/products/1/visibility").with(user("customer").roles("USER"))
                    .contentType("application/json").content("{\"catalogVisible\":false}"))
                    .andExpect(status().isForbidden());
            mvc.perform(post("/api/products").with(user("customer").roles("USER"))
                    .contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
            mvc.perform(put("/api/products/1").with(user("customer").roles("USER"))
                    .contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
            for (var method : List.of(post("/api/products/1/variants"),patch("/api/products/1/variants/1"))) {
                mvc.perform(method.contentType("application/json").content("{\"stock\":20,\"size\":\"40\"}"))
                        .andExpect(status().isUnauthorized());
            }
            for (var method : List.of(post("/api/products/1/variants"),patch("/api/products/1/variants/1"))) {
                mvc.perform(method.with(user("customer").roles("USER")).contentType("application/json")
                        .content("{\"stock\":20,\"size\":\"40\"}")).andExpect(status().isForbidden());
            }
            assertVisibilityHttpValidation(mvc);
        }
    }

    private void assertVisibilityHttpValidation(org.springframework.test.web.servlet.MockMvc mvc) throws Exception {
        for (String body : List.of("{}", "{\"catalogVisible\":null}", "{\"catalogVisible\":\"invalid\"}")) {
            mvc.perform(patch("/api/products/1/visibility").with(user("admin").roles("ADMIN"))
                    .contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        tx.executeWithoutResult(status -> {
            int stock = products.findById(1L).orElseThrow().getStock();
            assertDoesNotThrow(() -> mvc.perform(patch("/api/products/1/visibility").with(user("admin").roles("ADMIN"))
                    .contentType("application/json").content("{\"catalogVisible\":false,\"stock\":999999}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.catalogVisible").value(false))
                    .andExpect(jsonPath("$.stock").value(stock)));
            status.setRollbackOnly();
        });
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5})
    void administratorHttpCreateAndUpdatePersistAllCategorySpecifications(int category) throws Exception {
        try (var web = productWebContext()) {
            var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            var json = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
            tx.executeWithoutResult(status -> {
                assertDoesNotThrow(() -> {
                    var create = fixture(category, "HTTP A");
                    var result = mvc.perform(post("/api/products").with(user("admin").roles("ADMIN"))
                            .contentType("application/json").content(adminJson(create)))
                            .andExpect(status().isCreated()).andReturn();
                    var saved = json.readValue(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8), ProductDto.class);
                    var update = fixture(category, "HTTP B");
                    preserveVariantChoices(update,saved);
                    update.setExpectedStock(saved.getStock()); update.setSku(saved.getSku());
                    mvc.perform(put("/api/products/" + saved.getId()).with(user("admin").roles("ADMIN"))
                            .contentType("application/json").content(adminJson(update))).andExpect(status().isOk());
                    reload();
                    assertSpecifications(update, service.getProductById(saved.getId()), category);
                });
                status.setRollbackOnly();
            });
        }
    }

    @Test void administratorVariantApiPersistsTotalsAndPreservesIdentityAcrossReload() throws Exception {
        try (var web=productWebContext()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            tx.executeWithoutResult(status->{
                var saved=service.createProduct(fixture(2,"Inventory"));
                assertDoesNotThrow(()->{
                    var response=mvc.perform(post("/api/products/"+saved.getId()+"/variants").with(user("admin").roles("ADMIN"))
                            .contentType("application/json").content("{\"color\":\"Xanh\",\"size\":\"41\",\"stock\":20}"))
                            .andExpect(status().isCreated()).andExpect(jsonPath("$.stock").value(20)).andReturn();
                    var added=new com.fasterxml.jackson.databind.ObjectMapper().readValue(response.getResponse()
                            .getContentAsString(java.nio.charset.StandardCharsets.UTF_8),com.sports.dto.ProductVariantDto.class);
                    reload();assertEquals(27,service.getProductById(saved.getId()).getStock());
                    assertTrue(service.getProductById(saved.getId()).getAvailableSizes().contains("41"));
                    verifyVariantPatch(mvc,saved.getId(),added.getId());
                    reload();assertEquals(7,service.getProductById(saved.getId()).getStock());
                    assertFalse(service.getProductById(saved.getId()).getAvailableSizes().contains("41"));
                });
                status.setRollbackOnly();
            });
        }
    }

    private void verifyVariantPatch(org.springframework.test.web.servlet.MockMvc mvc,Long productId,Long variantId) throws Exception {
        String path="/api/products/"+productId+"/variants/"+variantId;
        mvc.perform(patch(path).with(user("admin").roles("ADMIN")).contentType("application/json")
                .content("{\"stock\":18,\"expectedStock\":20,\"size\":\"42\"}")).andExpect(status().isBadRequest());
        mvc.perform(patch(path).with(user("admin").roles("ADMIN")).contentType("application/json")
                .content("{\"stock\":18,\"expectedStock\":20,\"color\":null}")).andExpect(status().isBadRequest());
        mvc.perform(patch(path).with(user("admin").roles("ADMIN")).contentType("application/json")
                .content("{\"stock\":18,\"expectedStock\":20,\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false)).andExpect(jsonPath("$.stock").value(18));
        mvc.perform(post("/api/products/"+productId+"/variants").with(user("admin").roles("ADMIN"))
                .contentType("application/json").content("{\"color\":\" Xanh \",\"size\":\"41\",\"stock\":20}"))
                .andExpect(status().isBadRequest());
    }

    private org.springframework.web.context.support.AnnotationConfigWebApplicationContext productWebContext() {
        var web = new org.springframework.web.context.support.AnnotationConfigWebApplicationContext();
        web.setServletContext(new org.springframework.mock.web.MockServletContext());
        web.register(com.sports.security.SecurityConfig.class, ProductController.class, GlobalExceptionHandler.class, ProductWebConfig.class);
        web.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("productService", service);
            factory.registerSingleton("productVariantService",context.getBean(ProductVariantService.class));
            factory.registerSingleton("jwtAuthenticationFilter", new com.sports.security.JwtAuthenticationFilter(
                    mock(com.sports.security.JwtTokenProvider.class), mock(com.sports.security.UserDetailsServiceImpl.class)));
        });
        web.refresh();
        return web;
    }

    @Configuration
    @org.springframework.web.servlet.config.annotation.EnableWebMvc
    static class ProductWebConfig {
    }

    @Configuration
    @EnableJpaRepositories("com.sports.repository")
    static class Config {
        @Bean
        DataSource dataSource() {
            String schema=System.getProperty("product.catalog.mysql.schema","");
            if (!schema.matches("hg_catalog_test_[0-9a-f]{32}"))
                throw new IllegalArgumentException("Product integration chỉ chạy trên schema hg_catalog_test_ + UUID cô lập");
            return new DriverManagerDataSource(
                    "jdbc:mysql://127.0.0.1:3306/"+schema+"?useSSL=false&allowPublicKeyRetrieval=true",
                    System.getProperty("product.catalog.mysql.user","root"),System.getProperty("product.catalog.mysql.password",""));
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("com.sports.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", Boolean.getBoolean("product.catalog.mysql.bootstrap") ? "update" : "validate",
                    "hibernate.dialect", "org.hibernate.dialect.MariaDBDialect",
                    "hibernate.physical_naming_strategy",
                    "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        ReviewService reviewService() {
            return mock(ReviewService.class);
        }

        @Bean
        ProductService productService(ProductRepository products, CategoryRepository categories,
                ReviewService reviews, ProductImageRepository images) {
            return new ProductService(products, categories, reviews, images);
        }

        @Bean ProductVariantService productVariantService(ProductRepository products,ProductVariantRepository variants) {
            return new ProductVariantService(products,variants);
        }
    }
}
