package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.sports.WebBadmintonApplication;
import com.sports.config.PayOSModeConfig;
import com.sports.entity.*;
import com.sports.entity.Role;
import com.sports.mockpayos.*;
import com.sports.repository.*;
import com.sports.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.net.*;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named="fix058.mysql",matches="true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MockPayOSIntegrationTest {
    private static ConfigurableApplicationContext app;
    private static Map<String,Object> settings;
    private static final ObjectMapper JSON=new ObjectMapper();
    private static Long owner,admin,productId;
    private static String voucher;
    private record Reply(int status,JsonNode body) {}

    @BeforeAll static void start() throws Exception {
        String schema=required("MOCK_DB_SCHEMA");
        if (!(schema.equals("web_badminton_mock_local") || schema.matches("web_badminton_mock_fix058_[0-9a-f]{32}"))
                || !"true".equals(System.getenv("FIX058_OWNED_EMPTY_DB"))) {
            throw new IllegalStateException("FIX-058 cần schema test riêng được cấp cho task và xác nhận rỗng");
        }
        settings=new HashMap<>(Map.of("payos.mode","MOCK","payos.mock-database",schema,"server.address","127.0.0.1",
                "server.port","0","spring.datasource.url",required("MOCK_DB_URL"),"spring.datasource.username",required("MOCK_DB_USER"),
                "spring.jpa.hibernate.ddl-auto","validate","spring.sql.init.mode","never","app.jwt.secret",required("MOCK_JWT_SECRET")));
        settings.put("spring.datasource.password",required("MOCK_DB_PASSWORD")); settings.put("payos.mock-jwt-secret",required("MOCK_JWT_SECRET"));
        settings.put("payos.client-id",""); settings.put("payos.api-key","");settings.put("payos.checksum-key","");
        var env=environment();new PayOSModeConfig().postProcessEnvironment(env,new SpringApplication(WebBadmintonApplication.class));
        bootstrapDomain(); app=launch();
    }

    private static String required(String name) {
        String value=System.getenv(name);if(value==null || value.isBlank())throw new IllegalStateException("Thiếu cấu hình test: "+name);
        return value;
    }

    private static ConfigurableEnvironment environment() {
        var env=new StandardEnvironment();env.getPropertySources().addFirst(new MapPropertySource("fix058TestOverrides",settings));
        env.setActiveProfiles("test","mock-payos");return env;
    }

    private static void bootstrapDomain() throws Exception {
        var ds=new DriverManagerDataSource(settings.get("spring.datasource.url").toString(),settings.get("spring.datasource.username").toString(),
                settings.get("spring.datasource.password").toString());
        try(var c=ds.getConnection();var tables=c.getMetaData().getTables(c.getCatalog(),null,"%",new String[]{"TABLE"})) {
            Set<String> existing=new HashSet<>();while(tables.next())existing.add(tables.getString("TABLE_NAME"));
            if(!existing.isEmpty()) {
                if(!existing.containsAll(Set.of("orders","users","payment_attempts"))) {
                    throw new IllegalStateException("Schema test nền chưa đầy đủ; không drop/recreate dữ liệu");
                }
                return;
            }
        }
        var factory=new LocalContainerEntityManagerFactoryBean();factory.setDataSource(ds);factory.setPackagesToScan("com.sports.entity");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","create","hibernate.dialect","org.hibernate.dialect.MySQLDialect",
                "hibernate.physical_naming_strategy","org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy"));
        factory.afterPropertiesSet();factory.destroy();
    }

    private static ConfigurableApplicationContext launch() {
        var application=new SpringApplication(WebBadmintonApplication.class);application.setEnvironment(environment());
        return application.run();
    }

    private static void fixtures() {
        new TransactionTemplate(app.getBean(PlatformTransactionManager.class)).executeWithoutResult(tx->{
            var users=app.getBean(UserRepository.class);String suffix=UUID.randomUUID().toString();
            owner=users.save(User.builder().username("customer-"+suffix).email("c-"+suffix+"@test.invalid").password("fixture-only")
                    .role(Role.ROLE_USER).isActive(true).build()).getId();
            admin=users.save(User.builder().username("admin-"+suffix).email("a-"+suffix+"@test.invalid").password("fixture-only")
                    .role(Role.ROLE_ADMIN).isActive(true).build()).getId();
            productId=app.getBean(ProductRepository.class).save(Product.builder().name("Vợt MOCK").brand("Test")
                    .price(new BigDecimal("100000")).stock(20).reservedStock(0).build()).getId();
            voucher="FIX058-"+suffix;
            app.getBean(VoucherRepository.class).save(Voucher.builder().code(voucher).discountType("FIXED")
                    .discountValue(new BigDecimal("1000")).maxUses(100).usedCount(0).expiresAt(LocalDateTime.now().plusDays(1)).build());
        });
    }

    @BeforeEach void freshFixtures() { fixtures(); }

    @AfterAll static void stop() { if(app!=null)app.close(); }

    private Reply request(String method,String path,Long actor,String key,Object body) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+app.getEnvironment().getProperty("local.server.port")+path));
        if(actor!=null)builder.header("Authorization","Bearer "+token(actor));
        if(key!=null)builder.header("Idempotency-Key",key);
        builder.header("Content-Type","application/json").method(method,body==null?HttpRequest.BodyPublishers.noBody()
                :HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        var response=HttpClient.newHttpClient().send(builder.build(),HttpResponse.BodyHandlers.ofString());
        return new Reply(response.statusCode(),response.body().isBlank()?JSON.nullNode():JSON.readTree(response.body()));
    }

    private String token(Long actor) {
        var principal=new CustomUserDetails(app.getBean(UserRepository.class).findById(actor).orElseThrow());
        return app.getBean(JwtTokenProvider.class).generateToken(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }

    private Long createOrder() throws Exception {
        var reply=request("POST","/api/orders",owner,UUID.randomUUID().toString(),Map.of("customerName","Khách MOCK",
                "shippingPhone","0900000000","shippingAddress","Địa chỉ snapshot MOCK","note","Giữ nguyên ghi chú",
                "paymentMethod","PAYOS_VIETQR","voucherCode",voucher,"items",List.of(Map.of("productId",productId,"quantity",1))));
        assertEquals(201,reply.status(),reply.body().toString());return reply.body().get("id").longValue();
    }
    private Reply link(Long id) throws Exception { return request("POST","/api/orders/"+id+"/payment-link",owner,UUID.randomUUID().toString(),null); }
    private Reply action(Long id,String scenario,String key) throws Exception {
        return request("POST","/api/dev/mock-payos/orders/"+id+"/actions",admin,key,Map.of("scenario",scenario));
    }
    private Reply context(Long id) throws Exception { return request("GET","/api/orders/"+id+"/checkout-context",owner,null,null); }

    @Test @org.junit.jupiter.api.Order(1)
    void sameOrderCodTransitionLatePaymentAndDeliveryGateKeepResourcesExactlyOnce() throws Exception {
        Long id=createOrder();assertEquals(201,link(id).status());var before=context(id).body();
        long attemptId=before.path("payment").path("id").longValue();
        var changed=request("POST","/api/orders/"+id+"/payment-method-transitions",owner,UUID.randomUUID().toString(),
                Map.of("targetPaymentMethod","COD","expectedStateVersion",before.path("stateVersion").longValue()));
        assertEquals(200,changed.status(),changed.body().toString());var after=context(id).body();
        assertEquals(id.longValue(),after.path("order").path("id").longValue());assertEquals(attemptId,after.path("payment").path("id").longValue());
        for(String field:List.of("items","shippingPhone","shippingAddress","note","totalAmount","discountAmount")) {
            assertEquals(before.path("order").get(field),after.path("order").get(field));
        }
        var p=app.getBean(ProductRepository.class).findById(productId).orElseThrow();int stock=p.getStock(),reserved=p.getReservedStock();
        int used=app.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount();
        String key=UUID.randomUUID().toString();assertEquals(200,action(id,"LATE_PAYMENT_WEBHOOK",key).status());
        assertEquals(200,action(id,"LATE_PAYMENT_WEBHOOK",key).status());
        assertEquals("NEEDS_REVIEW",context(id).body().path("payment").path("status").asText());
        assertThrows(com.sports.exception.PaymentLinkException.class,()->app.getBean(OrderStatusService.class).update(id,OrderStatus.SHIPPING));
        p=app.getBean(ProductRepository.class).findById(productId).orElseThrow();assertEquals(stock,p.getStock());assertEquals(reserved,p.getReservedStock());
        assertEquals(used,app.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }

    @Test @org.junit.jupiter.api.Order(2)
    void createTimeoutRecoveryStateAndMigrationSurviveRealApplicationRestart() throws Exception {
        Long id=createOrder();assertEquals(200,action(id,"ARM_CREATE_TIMEOUT_AFTER",UUID.randomUUID().toString()).status());
        assertEquals(504,link(id).status());var attempt=context(id).body().path("payment");assertEquals("CREATING",attempt.path("status").asText());
        app.close();app=launch();
        assertEquals(200,action(id,"RECOVER_CREATE",UUID.randomUUID().toString()).status());var recovered=context(id).body().path("payment");
        assertEquals(attempt.path("id"),recovered.path("id"));assertEquals("PENDING",recovered.path("status").asText());
        String key=UUID.randomUUID().toString();assertEquals(200,action(id,"PAYMENT_PAID_WEBHOOK",key).status());
        app.close();app=launch();assertEquals(200,action(id,"PAYMENT_PAID_WEBHOOK",key).status());
        assertEquals("PAID",context(id).body().path("order").path("status").asText());
    }

    @Test @org.junit.jupiter.api.Order(3)
    void concurrentPaymentIntentAndAuthorizationUseRealHttpAndDatabase() throws Exception {
        Long id=createOrder();assertEquals(201,link(id).status());String key=UUID.randomUUID().toString();
        var pool=Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->action(id,"PAYMENT_PAID_WEBHOOK",key));var second=pool.submit(()->action(id,"PAYMENT_PAID_WEBHOOK",key));
            assertTrue(Set.of(200,202).contains(first.get(20,TimeUnit.SECONDS).status()));
            assertTrue(Set.of(200,202).contains(second.get(20,TimeUnit.SECONDS).status()));
        }finally{pool.shutdownNow();}
        assertEquals(200,action(id,"PAYMENT_PAID_WEBHOOK",key).status());
        assertEquals(409,action(id,"PAYMENT_FAILED",key).status());
        assertEquals(401,request("GET","/api/orders/"+id+"/checkout-context",null,null,null).status());
        assertEquals(403,request("GET","/api/orders/"+id+"/checkout-context",admin,null,null).status());
        assertEquals(403,request("POST","/api/dev/mock-payos/orders/"+id+"/actions",owner,key,Map.of("scenario","REPLAY_WEBHOOK")).status());
    }

    @ParameterizedTest @ValueSource(strings={"PAYMENT_FAILED","PAYMENT_CANCELLED","PAYMENT_EXPIRED"})
    @org.junit.jupiter.api.Order(4)
    void zeroMoneyTerminalProviderAllowsSafeCodWithoutCancellingOrder(String scenario) throws Exception {
        Long id=createOrder();assertEquals(201,link(id).status());
        assertEquals(200,action(id,scenario,UUID.randomUUID().toString()).status());
        var current=context(id).body();assertEquals(scenario.substring(8),current.path("payment").path("mockProviderStatus").asText());
        assertEquals("PENDING",current.path("order").path("status").asText());
        var result=request("POST","/api/orders/"+id+"/payment-method-transitions",owner,UUID.randomUUID().toString(),
                Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").longValue()));
        assertEquals(200,result.status(),result.body().toString());
        assertEquals("COD",context(id).body().path("order").path("paymentMethod").asText());
    }

    @ParameterizedTest @ValueSource(strings={"ARM_QUERY_UNKNOWN","ARM_QUERY_TIMEOUT_BEFORE","ARM_QUERY_TIMEOUT_AFTER",
            "ARM_QUERY_502","ARM_QUERY_503","ARM_QUERY_504","ARM_CANCEL_TIMEOUT_BEFORE","ARM_CANCEL_TIMEOUT_AFTER","ARM_CANCEL_PROCESSING"})
    @org.junit.jupiter.api.Order(5)
    void transitionTimeoutUnknownAndProcessingRecoverUsingSameIntent(String fault) throws Exception {
        Long id=createOrder();assertEquals(201,link(id).status());
        assertEquals(200,action(id,fault,UUID.randomUUID().toString()).status());
        var current=context(id).body();String key=UUID.randomUUID().toString();
        var body=Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").longValue());
        var first=request("POST","/api/orders/"+id+"/payment-method-transitions",owner,key,body);
        int expected=fault.endsWith("PROCESSING")?202:fault.endsWith("UNKNOWN") || fault.endsWith("502")?502:fault.endsWith("503")?503:504;
        assertEquals(expected,first.status(),first.body().toString());
        var recovery=context(id);assertEquals(200,recovery.status());
        assertEquals(key,recovery.body().path("operation").path("idempotencyKey").asText());
        if(fault.endsWith("PROCESSING"))assertEquals(200,action(id,"COMPLETE_CANCEL_ZERO",UUID.randomUUID().toString()).status());
        waitForTransitionLease(id);
        var replay=request("POST","/api/orders/"+id+"/payment-method-transitions",owner,key,body);
        assertEquals(200,replay.status(),replay.body().toString());
        assertEquals(id.longValue(),context(id).body().path("order").path("id").longValue());
        assertEquals(409,request("POST","/api/orders/"+id+"/payment-method-transitions",owner,key,
                Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").asLong()+1)).status());
    }

    private void waitForTransitionLease(Long id) throws Exception {
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(75);
        while(context(id).body().path("operation").path("retryAfterSeconds").asLong()>0) {
            if(System.nanoTime()>deadline)throw new AssertionError("Transition lease không hết hạn theo contract");
            Thread.sleep(1000);
        }
        Thread.sleep(1100);
    }

    @Test @org.junit.jupiter.api.Order(6)
    void createTimeoutBeforeEffectNeedsClosureCompletionAndCannotSwitchWhileCreating() throws Exception {
        Long id=createOrder();assertEquals(200,action(id,"ARM_CREATE_TIMEOUT_BEFORE",UUID.randomUUID().toString()).status());
        assertEquals(504,link(id).status());var current=context(id).body();
        assertEquals("CREATING",current.path("payment").path("status").asText());
        assertEquals(409,request("POST","/api/orders/"+id+"/payment-method-transitions",owner,UUID.randomUUID().toString(),
                Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").longValue())).status());
        assertEquals(200,action(id,"COMPLETE_CREATE",UUID.randomUUID().toString()).status());
        assertEquals(200,action(id,"RECOVER_CREATE",UUID.randomUUID().toString()).status());
        assertEquals("PENDING",context(id).body().path("payment").path("status").asText());
    }

    @Test @org.junit.jupiter.api.Order(7)
    void queryReconciliationSettlesOnceAndPaidAttemptCannotBecomeCod() throws Exception {
        Long id=createOrder();var linked=link(id);assertEquals(201,linked.status());
        assertEquals(200,action(id,"PAYMENT_PAID_QUERY",UUID.randomUUID().toString()).status());
        String key=UUID.randomUUID().toString();String path="/api/admin/payments/"+linked.body().path("id").asLong()+"/reconcile";
        assertEquals(200,request("POST",path,admin,key,Map.of("reason","Đối soát MOCK")).status());
        assertEquals(200,request("POST",path,admin,key,Map.of("reason","Đối soát MOCK")).status());
        var current=context(id).body();assertEquals("PAID",current.path("order").path("status").asText());
        assertEquals(409,request("POST","/api/orders/"+id+"/payment-method-transitions",owner,UUID.randomUUID().toString(),
                Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").asLong())).status());
        var p=app.getBean(ProductRepository.class).findById(productId).orElseThrow();
        assertEquals(19,p.getStock());assertEquals(0,p.getReservedStock());
        assertEquals(1,app.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }

    @Test @org.junit.jupiter.api.Order(8)
    void webhookAndReconcileRaceShareOneLedgerFactAndOneResourceConsumption() throws Exception {
        Long id=createOrder();var linked=link(id);assertEquals(201,linked.status());
        assertEquals(200,action(id,"PAYMENT_PAID_QUERY",UUID.randomUUID().toString()).status());
        String path="/api/admin/payments/"+linked.body().path("id").asLong()+"/reconcile";
        var pool=Executors.newFixedThreadPool(2);
        try {
            var webhook=pool.submit(()->action(id,"REPLAY_WEBHOOK",UUID.randomUUID().toString()));
            var query=pool.submit(()->request("POST",path,admin,UUID.randomUUID().toString(),Map.of("reason","Race MOCK")));
            assertEquals(200,webhook.get(20,TimeUnit.SECONDS).status());assertEquals(200,query.get(20,TimeUnit.SECONDS).status());
        }finally{pool.shutdownNow();}
        assertEquals(1,app.getBean(PaymentEventRepository.class).findByPaymentAttemptId(linked.body().path("id").asLong()).size());
        var p=app.getBean(ProductRepository.class).findById(productId).orElseThrow();assertEquals(19,p.getStock());assertEquals(0,p.getReservedStock());
        assertEquals(1,app.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }

    @Test @org.junit.jupiter.api.Order(9)
    void providerMoneySurvivesMerchantRollbackAndRestartThenSettlesOnReplay() throws Exception {
        Long id=createOrder();var linked=link(id);assertEquals(201,linked.status());
        assertEquals(200,action(id,"PAYMENT_PAID_QUERY",UUID.randomUUID().toString()).status());
        var gateway=app.getBean(PayOSGateway.class);var proof=gateway.queryPayment(linked.body().path("orderCode").asLong());
        var tx=new TransactionTemplate(app.getBean(PlatformTransactionManager.class));
        assertThrows(IllegalStateException.class,()->tx.executeWithoutResult(status->{
            app.getBean(PaymentSettlementService.class).query(linked.body().path("id").asLong(),proof);
            throw new IllegalStateException("FIX-058 merchant rollback fixture");
        }));
        assertEquals("PENDING",context(id).body().path("order").path("status").asText());
        assertTrue(app.getBean(PaymentEventRepository.class).findByPaymentAttemptId(linked.body().path("id").asLong()).isEmpty());
        assertResources(19,1,1);
        app.close();app=launch();
        assertEquals("PAID",app.getBean(PayOSGateway.class).queryPayment(linked.body().path("orderCode").asLong()).status());
        assertEquals(200,action(id,"REPLAY_WEBHOOK",UUID.randomUUID().toString()).status());
        assertEquals("PAID",context(id).body().path("order").path("status").asText());assertResources(19,0,1);
    }

    @ParameterizedTest @ValueSource(strings={"PARTIAL_PAYMENT","NON_SUCCESS_WEBHOOK"})
    @org.junit.jupiter.api.Order(10)
    void unsafeEvidenceRequiresReviewAndCannotSwitchOrConsumeResources(String scenario) throws Exception {
        Long id=createOrder();assertEquals(201,link(id).status());
        assertEquals(200,action(id,scenario,UUID.randomUUID().toString()).status());
        var current=context(id).body();assertEquals("NEEDS_REVIEW",current.path("payment").path("status").asText());
        assertEquals("PENDING",current.path("order").path("status").asText());
        assertEquals(409,request("POST","/api/orders/"+id+"/payment-method-transitions",owner,UUID.randomUUID().toString(),
                Map.of("targetPaymentMethod","COD","expectedStateVersion",current.path("stateVersion").asLong())).status());
        assertResources(19,1,1);
    }

    @Test @org.junit.jupiter.api.Order(11)
    void actualMockRuntimeHasNoRealClientAndEnforcesMetadataAndActionAuthorization() throws Exception {
        assertTrue(app.getBean(PayOSGateway.class) instanceof MockPayOSProvider);
        assertTrue(app.getBeansOfType(PayOSPaymentClient.class).isEmpty());
        var metadata=request("GET","/api/payment/environment",owner,null,null);
        assertEquals(200,metadata.status());assertEquals("MOCK",metadata.body().path("paymentMode").asText());
        assertFalse(metadata.body().path("simulationControlsAllowed").asBoolean());
        assertTrue(request("GET","/api/payment/environment",admin,null,null).body().path("simulationControlsAllowed").asBoolean());
        assertEquals(401,request("POST","/api/dev/mock-payos/orders/9007199254740991/actions",null,
                UUID.randomUUID().toString(),Map.of("scenario","REPLAY_WEBHOOK")).status());
        assertEquals(404,action(9007199254740991L,"REPLAY_WEBHOOK",UUID.randomUUID().toString()).status());
        assertEquals(404,request("POST","/api/payment/mock-webhook-trigger",admin,null,null).status());
    }

    private void assertResources(int stock,int reserved,int used) {
        var product=app.getBean(ProductRepository.class).findById(productId).orElseThrow();
        assertEquals(stock,product.getStock());assertEquals(reserved,product.getReservedStock());
        assertEquals(used,app.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }
}
