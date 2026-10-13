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
        assertFalse(service.getProductImages(1L).isEmpty());
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
        assertFalse(service.getProductImages(31L, "all").isEmpty());
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
            filterFixture(keyword, "[\"140\"]", "Unisex", true);
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
            var json = new com.fasterxml.jackson.databind.ObjectMapper();
            tx.executeWithoutResult(status -> {
                assertDoesNotThrow(() -> {
                    var create = fixture(category, "HTTP A");
                    var result = mvc.perform(post("/api/products").with(user("admin").roles("ADMIN"))
                            .contentType("application/json").content(json.writeValueAsString(create)))
                            .andExpect(status().isCreated()).andReturn();
                    var saved = json.readValue(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8), ProductDto.class);
                    var update = fixture(category, "HTTP B");
                    update.setExpectedStock(saved.getStock()); update.setSku(saved.getSku());
                    mvc.perform(put("/api/products/" + saved.getId()).with(user("admin").roles("ADMIN"))
                            .contentType("application/json").content(json.writeValueAsString(update))).andExpect(status().isOk());
                    reload();
                    assertSpecifications(update, service.getProductById(saved.getId()), category);
                });
                status.setRollbackOnly();
            });
        }
    }

    private org.springframework.web.context.support.AnnotationConfigWebApplicationContext productWebContext() {
        var web = new org.springframework.web.context.support.AnnotationConfigWebApplicationContext();
        web.setServletContext(new org.springframework.mock.web.MockServletContext());
        web.register(com.sports.security.SecurityConfig.class, ProductController.class, GlobalExceptionHandler.class, ProductWebConfig.class);
        web.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("productService", service);
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
            return new DriverManagerDataSource(
                    "jdbc:mysql://127.0.0.1:3306/badminton_catalog_restore_20261011?useSSL=false&allowPublicKeyRetrieval=true",
                    "root", "");
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("com.sports.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate",
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
    }
}
