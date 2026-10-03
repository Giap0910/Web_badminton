package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.controller.OrderController;
import com.sports.dto.*;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.exception.*;
import com.sports.repository.*;
import com.sports.security.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.core.MethodParameter;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

class OrderIdempotencyTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private final PayOSService payment = mock(PayOSService.class);
    private final ObjectMapper json = new ObjectMapper();
    private final User user = User.builder().id(1L).username("test").role(Role.ROLE_USER).build();
    private Product product;
    private OrderService service;
    private MockMvc mvc;
    private Order saved;
    private String key;

    @BeforeEach
    void setup() {
        key = UUID.randomUUID().toString();
        product = Product.builder().id(10L).name("Vợt").price(new BigDecimal("100000"))
                .stock(10).reservedStock(0).build();
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
        when(orders.findByUserIdAndIdempotencyKey(1L, key)).thenAnswer(i -> Optional.ofNullable(saved));
        when(orders.saveAndFlush(any())).thenAnswer(i -> {
            saved = i.getArgument(0);
            saved.setId(99L);
            return saved;
        });
        service = new OrderService(orders, products, users, payment,
                new VoucherService(vouchers, new MockEnvironment()), mock(EntityManager.class));
        mvc = MockMvcBuilders.standaloneSetup(new OrderController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(principalResolver()).build();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "bad-key", "1-1-1-1-1", "00000000-0000-0000-0000-00000000000g",
            " 00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000 "})
    void invalidKeyRejectsBeforeMutation(String invalidKey) throws Exception {
        var call = post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request()));
        if (invalidKey != null) call.header("Idempotency-Key", invalidKey);

        mvc.perform(call).andExpect(status().isBadRequest());

        verifyNoInteractions(orders, users, products, vouchers, payment);
    }

    @Test
    void firstCreateAndReplayUseDifferentHttpStatusesWithoutRepeatingSideEffects() throws Exception {
        String body = json.writeValueAsString(request());
        mvc.perform(post("/api/orders").header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(99));

        mvc.perform(post("/api/orders").header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(99));

        verify(orders, times(1)).saveAndFlush(any());
        verify(products, times(1)).save(product);
        assertEquals(9, product.getStock());
        assertEquals(1, product.getReservedStock());
        verifyNoInteractions(vouchers, payment);
    }

    @Test
    void differentPayloadReturnsConflictWithoutMutation() throws Exception {
        service.createOrder(1L, request(), key);
        var changed = request();
        changed.setNote("Nội dung mới");

        mvc.perform(post("/api/orders").header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(changed)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

        verify(orders, times(1)).saveAndFlush(any());
        verify(products, times(1)).save(product);
        verifyNoInteractions(vouchers, payment);
    }

    @Test
    void replayPrecedesPendingLimitAndCatalogValidation() {
        var first = service.createOrder(1L, request(), key);
        when(orders.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(3);
        product.setPrice(BigDecimal.ZERO);

        var replay = service.createOrder(1L, request(), key);
        assertEquals(first.order().getId(), replay.order().getId());
        assertTrue(replay.replay());
        assertThrows(BadRequestException.class,
                () -> service.createOrder(1L, request(), UUID.randomUUID().toString()));
        verify(products, times(1)).findByIdForUpdate(10L);
        verify(orders, times(1)).saveAndFlush(any());
    }

    @Test
    void canonicalizationIgnoresJsonFormattingAndNormalizesKnownDefaults() throws Exception {
        String payload = json.writeValueAsString(request());
        var node = json.readTree(payload);
        var reordered = new com.fasterxml.jackson.databind.node.ObjectNode(json.getNodeFactory());
        var names = new ArrayList<String>();
        node.fieldNames().forEachRemaining(names::add);
        Collections.reverse(names);
        names.forEach(name -> reordered.set(name, node.get(name)));
        var other = json.readValue(json.writerWithDefaultPrettyPrinter().writeValueAsString(reordered), OrderCreateRequest.class);
        other.setPaymentMethod(" COD ");
        assertEquals(OrderRequestFingerprint.hash(request()), OrderRequestFingerprint.hash(other));
        assertEquals(key, OrderRequestFingerprint.validateKey(key.toUpperCase(Locale.ROOT)));
    }

    @ParameterizedTest
    @MethodSource("changes")
    void relevantPayloadChangesHaveDifferentHashes(Consumer<OrderCreateRequest> change) {
        var modified = request();
        change.accept(modified);
        assertNotEquals(OrderRequestFingerprint.hash(request()), OrderRequestFingerprint.hash(modified));
    }

    @Test
    void canonicalItemsFollowExistingStableProductSort() {
        var first = request();
        first.setItems(List.of(new OrderItemRequest(20L, 1), new OrderItemRequest(10L, 1)));
        var reversed = request();
        reversed.setItems(List.of(new OrderItemRequest(10L, 1), new OrderItemRequest(20L, 1)));
        assertEquals(OrderRequestFingerprint.hash(first), OrderRequestFingerprint.hash(reversed));
        var left = new OrderItemRequest(10L, 1);
        left.setSelectedColor("Đỏ");
        first.setItems(List.of(left, new OrderItemRequest(10L, 1)));
        reversed.setItems(List.of(new OrderItemRequest(10L, 1), left));
        assertNotEquals(OrderRequestFingerprint.hash(first), OrderRequestFingerprint.hash(reversed));
    }

    @Test
    void corsAllowsIdempotencyHeaderAndPreservesWhitelist() {
        var security = new SecurityConfig(new JwtAuthenticationFilter(mock(JwtTokenProvider.class),
                mock(UserDetailsServiceImpl.class)));
        ReflectionTestUtils.setField(security, "allowedOrigins", "http://localhost:5173,http://127.0.0.1:5173");
        var configuration = security.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/orders"));
        assertNotNull(configuration);
        assertTrue(configuration.getAllowedHeaders().contains("Idempotency-Key"));
        assertEquals(List.of("http://localhost:5173", "http://127.0.0.1:5173"), configuration.getAllowedOrigins());
        assertNull(configuration.checkOrigin("https://untrusted.example"));
    }

    @Test
    void uniqueConstraintFailureIsMappedToControlledConflict() {
        var violation = new org.hibernate.exception.ConstraintViolationException("Trùng key",
                new java.sql.SQLException("Duplicate", "23000"), "uk_orders_user_idempotency");
        doThrow(new org.springframework.dao.DataIntegrityViolationException("Không thể ghi", violation))
                .when(orders).saveAndFlush(any());

        assertThrows(IdempotencyConflictException.class, () -> service.createOrder(1L, request(), key));
        verify(orders, times(1)).saveAndFlush(any());
    }

    @Test
    void unrelatedDatabaseFailureIsNotSwallowedAsIdempotencyConflict() {
        var failure = new org.springframework.dao.DataIntegrityViolationException("Lỗi constraint khác");
        doThrow(failure).when(orders).saveAndFlush(any());

        assertSame(failure, assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.createOrder(1L, request(), key)));
    }

    static OrderCreateRequest request() {
        var request = new OrderCreateRequest();
        request.setItems(List.of(new OrderItemRequest(10L, 1)));
        request.setCustomerName("Khách kiểm thử");
        request.setShippingPhone("0900000000");
        request.setShippingAddress("Địa chỉ kiểm thử");
        request.setPaymentMethod("COD");
        return request;
    }

    @Test
    void securityChainRequiresLoginAndPreservesRoleAndPrincipalOwnership() throws Exception {
        try (var context = webContext()) {
            var secureMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            String body = json.writeValueAsString(request());
            secureMvc.perform(post("/api/orders").header("Idempotency-Key", key)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
            secureMvc.perform(get("/api/orders/all").with(user(new CustomUserDetails(this.user))))
                    .andExpect(status().isForbidden());
            secureMvc.perform(post("/api/orders").with(user(new CustomUserDetails(this.user)))
                    .header("Idempotency-Key", key).contentType(MediaType.APPLICATION_JSON)
                    .content(body.substring(0, body.length() - 1) + ",\"userId\":999}"))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.userId").value(1));
            verify(users).findByIdForUpdate(1L);
            verify(users, never()).findByIdForUpdate(999L);
        }
    }

    @Test
    void corsPreflightAcceptsNewHeaderAndRejectsUnknownOrigin() throws Exception {
        try (var context = webContext()) {
            var secureMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            secureMvc.perform(options("/api/orders").header("Origin", "http://localhost:5173")
                    .header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "Idempotency-Key,Content-Type,Authorization"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
            secureMvc.perform(options("/api/orders").header("Origin", "https://untrusted.example")
                    .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isForbidden());
        }
    }

    private AnnotationConfigWebApplicationContext webContext() {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(SecurityConfig.class, OrderController.class, GlobalExceptionHandler.class, WebConfig.class);
        context.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("orderService", service);
            factory.registerSingleton("jwtAuthenticationFilter", new JwtAuthenticationFilter(
                    mock(JwtTokenProvider.class), mock(UserDetailsServiceImpl.class)));
        });
        context.refresh();
        return context;
    }

    @Configuration
    @EnableWebMvc
    static class WebConfig {
    }

    private HandlerMethodArgumentResolver principalResolver() {
        return new HandlerMethodArgumentResolver() {
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == CustomUserDetails.class;
            }
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory factory) {
                return new CustomUserDetails(user);
            }
        };
    }

    static Stream<Consumer<OrderCreateRequest>> changes() {
        return Stream.of(r -> r.setCustomerName("Tên khác"), r -> r.setShippingPhone("0911111111"),
                r -> r.setShippingAddress("Địa chỉ khác"), r -> r.setNote("Ghi chú"),
                r -> r.setPaymentMethod("PAYOS_VIETQR"), r -> r.setVoucherCode("SALE"),
                r -> r.setShippingFee(BigDecimal.ONE), r -> r.getItems().get(0).setProductId(11L),
                r -> r.getItems().get(0).setQuantity(2), r -> r.getItems().get(0).setSelectedColor("Đỏ"),
                r -> r.getItems().get(0).setSelectedSize("S"), r -> r.getItems().get(0).setSelectedWeight("4U"),
                r -> r.getItems().get(0).setStringTension("24"), r -> r.getItems().get(0).setStringingService("Căng cước"));
    }
}
