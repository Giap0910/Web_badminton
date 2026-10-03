package com.sports.service;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.entity.Role;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.*;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named = "fix002.mysql", matches = "true")
class PaymentLinkIntegrationTest {
    private static final String SCHEMA = "fix002_test_" + UUID.randomUUID().toString().replace("-", "");
    private static AnnotationConfigApplicationContext context;
    private PaymentLinkService service;
    private PayOSPaymentClient client;
    private PaymentAttemptRepository attempts;
    private OrderRepository orders;
    private TransactionTemplate tx;
    private Long orderId;
    private Long userId;
    private Long productId;
    private String voucherCode;
    private final String key = UUID.randomUUID().toString();

    @BeforeAll
    static void start() throws Exception {
        try (var connection = connect(); var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE `" + SCHEMA + "` CHARACTER SET utf8mb4");
        }
        context = new AnnotationConfigApplicationContext(Config.class);
    }

    @AfterAll
    static void stop() throws Exception {
        if (context != null) context.close();
        if (!SCHEMA.matches("fix002_test_[0-9a-f]{32}")) throw new IllegalStateException();
        try (var connection = connect(); var statement = connection.createStatement()) {
            statement.execute("DROP DATABASE `" + SCHEMA + "`");
        }
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection("jdbc:mysql://127.0.0.1:3306/",
                System.getProperty("fix002.mysql.user", "root"), System.getProperty("fix002.mysql.password", ""));
    }

    @BeforeEach
    void fixture() {
        service = context.getBean(PaymentLinkService.class);
        client = context.getBean(PayOSPaymentClient.class);
        attempts = context.getBean(PaymentAttemptRepository.class);
        orders = context.getBean(OrderRepository.class);
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        reset(client);
        tx.executeWithoutResult(status -> {
            var users = context.getBean(UserRepository.class);
            String name = UUID.randomUUID().toString();
            User user = users.save(User.builder().username(name).email(name + "@test.invalid")
                    .password("test-only").role(Role.ROLE_USER).build());
            userId = user.getId();
            Order order = Order.builder().user(user).totalAmount(new BigDecimal("100000"))
                    .expiresAt(LocalDateTime.now().plusMinutes(15)).build();
            orders.saveAndFlush(order);
            order.setPayosOrderCode(1000000000L + order.getId());
            orderId = order.getId();
        });
        inventoryFixture();
    }

    private void inventoryFixture() {
        tx.executeWithoutResult(s -> {
            productId = context.getBean(ProductRepository.class).save(Product.builder().name("Vợt test")
                    .brand("Test").price(new BigDecimal("100000")).stock(9).reservedStock(1).build()).getId();
            voucherCode = UUID.randomUUID().toString();
            context.getBean(VoucherRepository.class).save(Voucher.builder().code(voucherCode)
                    .discountType("FIXED").discountValue(BigDecimal.TEN).usedCount(1).maxUses(10).build());
        });
    }

    private void assertInventoryUnchanged() {
        Product product = context.getBean(ProductRepository.class).findById(productId).orElseThrow();
        assertEquals(9, product.getStock());
        assertEquals(1, product.getReservedStock());
        assertEquals(1, context.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucherCode)
                .orElseThrow().getUsedCount());
        assertEquals(1, orders.findByUserIdOrderByCreatedAtDesc(userId).size());
    }

    @Test
    void newAndExistingLinkHaveNoOrderSideEffectAndHttpHasNoTransaction() {
        when(client.create(any())).thenAnswer(invocation -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            var saved = service.read(orderId, userId, false);
            assertEquals(PaymentAttempt.Status.CREATING, saved.status());
            return result(saved);
        });
        var first = service.create(orderId, userId, key);
        var retry = service.create(orderId, userId, key);
        assertEquals(201, first.status());
        assertEquals(200, retry.status());
        assertEquals(first.attempt().id(), retry.attempt().id());
        assertEquals(PaymentAttempt.Status.PENDING, retry.attempt().status());
        assertEquals("https://pay.payos.vn/test", retry.attempt().checkoutUrl());
        assertEquals(OrderStatus.PENDING, orders.findById(orderId).orElseThrow().getStatus());
        verify(client, times(1)).create(any());
        verify(client, never()).query(any());
        assertInventoryUnchanged();
    }

    @Test
    void timeoutThenQueryWithoutUrlRemainsCreatingAndNeverRecreates() {
        when(client.create(any())).thenThrow(new PaymentLinkException(504, "TIMEOUT", "Timeout test"));
        assertEquals(504, assertThrows(PaymentLinkException.class,
                () -> service.create(orderId, userId, key)).getStatus());
        var saved = service.read(orderId, userId, false);
        when(client.query(saved.orderCode())).thenAnswer(invocation -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            return new PayOSPaymentClient.Result(saved.orderCode(), saved.amount(), "recovered-id", null, null);
        });
        var retry = service.create(orderId, userId, key);
        assertEquals(202, retry.status());
        assertEquals(saved.id(), retry.attempt().id());
        assertEquals(saved.orderCode(), retry.attempt().orderCode());
        assertEquals("recovered-id", retry.attempt().paymentLinkId());
        assertNull(retry.attempt().checkoutUrl());
        assertNull(retry.attempt().qrPayload());
        assertEquals(PaymentAttempt.Status.CREATING, retry.attempt().status());
        verify(client, times(1)).create(any());
        verify(client).query(saved.orderCode());
        assertInventoryUnchanged();
    }

    @Test
    void notFoundAfterTimeoutDoesNotRecreate() {
        when(client.create(any())).thenThrow(new PaymentLinkException(504, "TIMEOUT", "Timeout test"));
        assertThrows(PaymentLinkException.class, () -> service.create(orderId, userId, key));
        var saved = service.read(orderId, userId, false);
        when(client.query(saved.orderCode())).thenReturn(null);
        assertEquals(202, service.create(orderId, userId, key).status());
        verify(client, times(1)).create(any());
        verify(client).query(saved.orderCode());
    }

    @Test
    void invalidKeysAndNonOwnerHaveNoAttemptOrGatewaySideEffect() {
        for (String invalid : Arrays.asList(null, "", "bad-uuid")) {
            assertEquals(400, assertThrows(PaymentLinkException.class,
                    () -> service.create(orderId, userId, invalid)).getStatus());
        }
        assertEquals(403, assertThrows(PaymentLinkException.class,
                () -> service.create(orderId, userId + 10000, key)).getStatus());
        assertNull(service.read(orderId, userId, false));
        verifyNoInteractions(client);
    }

    @Test
    void ineligibleOrdersAreRejected() {
        for (OrderStatus state : List.of(OrderStatus.PAID, OrderStatus.CANCELLED)) {
            tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow().setStatus(state));
            assertEquals(409, assertThrows(PaymentLinkException.class,
                    () -> service.create(orderId, userId, key)).getStatus());
        }
        tx.executeWithoutResult(s -> {
            Order order = orders.findById(orderId).orElseThrow();
            order.setStatus(OrderStatus.PENDING);
            order.setPaymentMethod("COD");
        });
        assertEquals(409, assertThrows(PaymentLinkException.class,
                () -> service.create(orderId, userId, key)).getStatus());
        verifyNoInteractions(client);
    }

    @Test
    void missingExpiredAndInvalidAmountOrdersAreRejected() {
        assertEquals(404, assertThrows(PaymentLinkException.class,
                () -> service.create(Long.MAX_VALUE, userId, key)).getStatus());
        tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow()
                .setExpiresAt(LocalDateTime.now().minusSeconds(1)));
        assertEquals(409, assertThrows(PaymentLinkException.class,
                () -> service.create(orderId, userId, key)).getStatus());
        tx.executeWithoutResult(s -> {
            var order = orders.findById(orderId).orElseThrow();
            order.setExpiresAt(LocalDateTime.now().plusMinutes(15));
            order.setTotalAmount(new BigDecimal("100000.50"));
        });
        assertThrows(com.sports.exception.BadRequestException.class, () -> service.create(orderId, userId, key));
        assertNull(service.read(orderId, userId, false));
        verifyNoInteractions(client);
    }

    @Test
    void databaseFailureAfterCreateKeepsStableIdentityForQueryRecovery() {
        Long previousOrderId = orderId;
        when(client.create(any())).thenAnswer(i -> result(i.getArgument(0)));
        var first = service.create(orderId, userId, key);
        cloneOrder(previousOrderId);
        doAnswer(i -> {
            PaymentAttemptResponse a = i.getArgument(0);
            return new PayOSPaymentClient.Result(a.orderCode(), a.amount(), first.attempt().paymentLinkId(),
                    first.attempt().checkoutUrl(), first.attempt().qrPayload());
        }).when(client).create(any());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.create(orderId, userId, key));
        var saved = service.read(orderId, userId, false);
        assertEquals(PaymentAttempt.Status.CREATING, saved.status());
        tx.executeWithoutResult(s -> attempts.findByOrderId(previousOrderId).orElseThrow().setPaymentLinkId(null));
        when(client.query(saved.orderCode())).thenReturn(new PayOSPaymentClient.Result(saved.orderCode(),
                saved.amount(), first.attempt().paymentLinkId(), null, null));
        assertEquals(202, service.create(orderId, userId, key).status());
        verify(client, times(2)).create(any());
        verify(client).query(saved.orderCode());
    }

    private void cloneOrder(Long previousOrderId) {
        tx.executeWithoutResult(s -> {
            Order original = orders.findById(previousOrderId).orElseThrow();
            Order next = Order.builder().user(original.getUser()).totalAmount(original.getTotalAmount())
                    .expiresAt(LocalDateTime.now().plusMinutes(15)).build();
            orders.saveAndFlush(next);
            next.setPayosOrderCode(1000000000L + next.getId());
            orderId = next.getId();
        });
    }

    @Test
    void simultaneousRequestsHaveOneAttemptAndOneCreate() throws Exception {
        var insideGateway = new CountDownLatch(1);
        var releaseGateway = new CountDownLatch(1);
        when(client.create(any())).thenAnswer(invocation -> {
            insideGateway.countDown();
            assertTrue(releaseGateway.await(10, TimeUnit.SECONDS));
            return result(invocation.getArgument(0));
        });
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.create(orderId, userId, key));
            assertTrue(insideGateway.await(10, TimeUnit.SECONDS));
            var second = executor.submit(() -> service.create(orderId, userId, key));
            assertEquals(202, second.get(10, TimeUnit.SECONDS).status());
            releaseGateway.countDown();
            assertEquals(201, first.get(10, TimeUnit.SECONDS).status());
            verify(client, times(1)).create(any());
            assertEquals(1, attempts.findAll().stream().filter(a -> a.getOrderCode()
                    .equals(1000000000L + orderId)).count());
        } finally {
            releaseGateway.countDown();
            executor.shutdownNow();
        }
    }

    private PayOSPaymentClient.Result result(PaymentAttemptResponse attempt) {
        return new PayOSPaymentClient.Result(attempt.orderCode(), attempt.amount(),
                "link-" + orderId, "https://pay.payos.vn/test", "payment-payload");
    }

    @Test
    void controllerReturns201200AndValidationErrorContract() throws Exception {
        var mvc = mvc(userId);
        when(client.create(any())).thenAnswer(i -> result(i.getArgument(0)));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link").header("Idempotency-Key", key))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.orderId").value(orderId));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link").header("Idempotency-Key", key))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("INVALID_IDEMPOTENCY_KEY"));
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void controllerReturns202AndOwnerOnly403() throws Exception {
        var mvc = mvc(userId);
        when(client.create(any())).thenThrow(new PaymentLinkException(504, "TIMEOUT", "Timeout test"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link").header("Idempotency-Key", key))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isGatewayTimeout());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link").header("Idempotency-Key", key))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isAccepted())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.status").value("CREATING"));
        mvc = mvc(userId + 10000);
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/orders/" + orderId + "/payment-link").header("Idempotency-Key", key))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private org.springframework.test.web.servlet.MockMvc mvc(Long owner) {
        var principal = new com.sports.security.CustomUserDetails(User.builder().id(owner)
                .username("test").role(Role.ROLE_USER).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities()));
        return org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new com.sports.controller.OrderPaymentController(service))
                .setControllerAdvice(new com.sports.exception.GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Configuration @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.sports.repository")
    static class Config {
        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:mysql://127.0.0.1:3306/" + SCHEMA,
                    System.getProperty("fix002.mysql.user", "root"), System.getProperty("fix002.mysql.password", ""));
        }
        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("com.sports.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create",
                    "hibernate.dialect", "org.hibernate.dialect.MariaDBDialect"));
            return factory;
        }
        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }
        @Bean PayOSPaymentClient client() { return mock(PayOSPaymentClient.class); }
        @Bean PaymentAttemptStore store(OrderRepository orders, PaymentAttemptRepository attempts) {
            return new PaymentAttemptStore(orders, attempts);
        }
        @Bean PaymentLinkService service(PaymentAttemptStore store, PayOSPaymentClient client) {
            return new PaymentLinkService(store, client);
        }
    }
}
