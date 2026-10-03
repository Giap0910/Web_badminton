package com.sports.service;

import com.sports.dto.*;
import com.sports.entity.*;
import com.sports.exception.*;
import com.sports.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named = "fix018.mysql", matches = "true")
class OrderIdempotencyIntegrationTest {
    private static final String SCHEMA = "fix018_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String SERVER = "jdbc:mysql://127.0.0.1:3306/";
    private static AnnotationConfigApplicationContext context;
    private OrderService service;
    private OrderRepository orders;
    private ProductRepository products;
    private VoucherRepository vouchers;
    private UserRepository users;
    private TransactionTemplate tx;
    private Long userId;
    private Long productId;
    private String voucherCode;

    @BeforeAll
    static void startDatabase() throws Exception {
        try (var connection = connect(""); var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE `" + SCHEMA + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            System.out.println("FIX-018 test DB: " + connection.getMetaData().getDatabaseProductVersion() + "; " + SCHEMA);
        }
        context = new AnnotationConfigApplicationContext(Config.class);
    }

    @AfterAll
    static void stopDatabase() throws Exception {
        if (context != null) context.close();
        if (!SCHEMA.matches("fix018_test_[0-9a-f]{32}")) throw new IllegalStateException("Schema test không hợp lệ");
        try (var connection = connect(""); var statement = connection.createStatement()) {
            statement.execute("DROP DATABASE `" + SCHEMA + "`");
        }
    }

    static Connection connect(String database) throws SQLException {
        return DriverManager.getConnection(SERVER + database + "?useSSL=false&allowPublicKeyRetrieval=true",
                System.getProperty("fix018.mysql.user", "root"), System.getProperty("fix018.mysql.password", ""));
    }

    @BeforeEach
    void fixture() {
        service = context.getBean(OrderService.class);
        orders = context.getBean(OrderRepository.class);
        products = context.getBean(ProductRepository.class);
        vouchers = context.getBean(VoucherRepository.class);
        users = context.getBean(UserRepository.class);
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        String suffix = UUID.randomUUID().toString();
        tx.executeWithoutResult(status -> {
            userId = users.save(User.builder().username(suffix).email(suffix + "@test.invalid")
                    .password("test-only").role(Role.ROLE_USER).build()).getId();
            productId = products.save(Product.builder().name("Vợt test").brand("Test")
                    .price(new BigDecimal("100000")).stock(10).reservedStock(0).build()).getId();
            voucherCode = "TEST-" + suffix;
            vouchers.save(Voucher.builder().code(voucherCode).discountType("FIXED")
                    .discountValue(new BigDecimal("10000")).usedCount(0).maxUses(10).build());
        });
    }

    @Test
    void concurrentRequestsCommitExactlyOneOrderStockReservationAndVoucherUse() throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        String key = UUID.randomUUID().toString();
        Callable<OrderCreationResult> call = () -> {
            ready.countDown();
            assertTrue(start.await(10, TimeUnit.SECONDS));
            return service.createOrder(userId, request(), key);
        };
        try {
            var first = pool.submit(call);
            var second = pool.submit(call);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            var a = first.get(20, TimeUnit.SECONDS);
            var b = second.get(20, TimeUnit.SECONDS);
            assertEquals(a.order().getId(), b.order().getId());
            assertNotEquals(a.replay(), b.replay());
            assertOneMutation();
            System.out.println("FIX-018 concurrent: orders=1, reserved_stock=1, voucher.used_count=1");
        } finally {
            start.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void retryAfterCommitReturnsSameOrderBeforePendingLimit() {
        String key = UUID.randomUUID().toString();
        var committed = service.createOrder(userId, request(), key);
        for (int i = 0; i < 2; i++) service.createOrder(userId, request(), UUID.randomUUID().toString());

        var retry = service.createOrder(userId, request(), key);

        assertTrue(retry.replay());
        assertEquals(committed.order().getId(), retry.order().getId());
        assertEquals(3, orders.countByUserIdAndStatus(userId, OrderStatus.PENDING));
        assertEquals(3, products.findById(productId).orElseThrow().getReservedStock());
        assertEquals(3, vouchers.findByCodeIgnoreCase(voucherCode).orElseThrow().getUsedCount());
        assertThrows(BadRequestException.class,
                () -> service.createOrder(userId, request(), UUID.randomUUID().toString()));
    }

    @Test
    void changedPayloadConflictsWithoutAdditionalMutations() {
        String key = UUID.randomUUID().toString();
        service.createOrder(userId, request(), key);
        var changed = request();
        changed.setNote("Khác dữ liệu");

        assertThrows(IdempotencyConflictException.class, () -> service.createOrder(userId, changed, key));

        assertOneMutation();
    }

    @Test
    void rollbackRemovesOrderKeyStockAndVoucherThenSameKeyCanRetry() {
        String key = UUID.randomUUID().toString();
        assertThrows(IllegalStateException.class, () -> tx.executeWithoutResult(status -> {
            service.createOrder(userId, request(), key);
            throw new IllegalStateException("Lỗi test sau persistence, trước commit");
        }));

        assertEquals(0, orders.countByUserIdAndStatus(userId, OrderStatus.PENDING));
        assertEquals(10, products.findById(productId).orElseThrow().getStock());
        assertEquals(0, products.findById(productId).orElseThrow().getReservedStock());
        assertEquals(0, vouchers.findByCodeIgnoreCase(voucherCode).orElseThrow().getUsedCount());
        var retry = service.createOrder(userId, request(), key);
        assertFalse(retry.replay());
        assertOneMutation();
    }

    @Test
    void databaseUniqueConstraintRejectsDuplicateUserKey() throws Exception {
        String key = UUID.randomUUID().toString();
        var first = service.createOrder(userId, request(), key);
        try (var connection = connect(SCHEMA); var statement = connection.prepareStatement(
                "INSERT INTO orders(user_id,total_amount,status,idempotency_key,request_hash) VALUES(?,?,?,?,?)")) {
            statement.setLong(1, userId);
            statement.setBigDecimal(2, BigDecimal.ONE);
            statement.setString(3, "PENDING");
            statement.setString(4, key);
            statement.setString(5, "a".repeat(64));
            var failure = assertThrows(SQLException.class, statement::executeUpdate);
            assertEquals("23000", failure.getSQLState());
            assertTrue(failure.getMessage().contains("uk_orders_user_idempotency"));
        }
        assertEquals(first.order().getId(), service.createOrder(userId, request(), key).order().getId());
        assertOneMutation();
    }

    @Test
    void sameKeyBelongsToEachAuthenticatedUserAndOwnershipRemainsEnforced() {
        String key = UUID.randomUUID().toString();
        var first = service.createOrder(userId, request(), key);
        Long otherId = tx.execute(status -> users.save(User.builder().username(UUID.randomUUID().toString())
                .email(UUID.randomUUID() + "@test.invalid").password("test-only").role(Role.ROLE_ADMIN).build()).getId());

        var second = service.createOrder(otherId, request(), key);

        assertNotEquals(first.order().getId(), second.order().getId());
        assertEquals(otherId, second.order().getUserId());
        assertThrows(UnauthorizedException.class, () -> service.getOrderById(first.order().getId(), otherId, false));
        assertEquals(first.order().getId(), service.getOrderById(first.order().getId(), otherId, true).getId());
    }

    private OrderCreateRequest request() {
        var request = OrderIdempotencyTest.request();
        request.setItems(List.of(new OrderItemRequest(productId, 1)));
        request.setVoucherCode(voucherCode);
        return request;
    }

    private void assertOneMutation() {
        assertEquals(1, orders.countByUserIdAndStatus(userId, OrderStatus.PENDING));
        assertEquals(9, products.findById(productId).orElseThrow().getStock());
        assertEquals(1, products.findById(productId).orElseThrow().getReservedStock());
        assertEquals(1, vouchers.findByCodeIgnoreCase(voucherCode).orElseThrow().getUsedCount());
    }

    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.sports.repository")
    static class Config {
        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource(SERVER + SCHEMA + "?useSSL=false&allowPublicKeyRetrieval=true",
                    System.getProperty("fix018.mysql.user", "root"), System.getProperty("fix018.mysql.password", ""));
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
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

        @Bean
        VoucherService voucherService(VoucherRepository repository) {
            return new VoucherService(repository, new MockEnvironment());
        }

        @Bean
        OrderService orderService(OrderRepository orders, ProductRepository products, UserRepository users,
                VoucherService vouchers, EntityManagerFactory factory) {
            return new OrderService(orders, products, users, mock(PayOSService.class), vouchers,
                    SharedEntityManagerCreator.createSharedEntityManager(factory));
        }
    }
}
