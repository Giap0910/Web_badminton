package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sports.controller.*;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.entity.Role;
import com.sports.exception.*;
import com.sports.repository.*;
import com.sports.security.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.context.annotation.*;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockServletContext;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfSystemProperty(named = "fix057.mysql", matches = "true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PaymentTransitionIntegrationTest {
    private static final String SCHEMA = "fix057_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String KEY = "fix057-fixture-only-key";
    private static AnnotationConfigWebApplicationContext context;
    private final ObjectMapper json = new ObjectMapper();
    private TransactionTemplate tx;
    private OrderRepository orders;
    private PaymentAttemptRepository attempts;
    private PaymentMethodTransitionRepository operations;
    private PaymentEventRepository events;
    private PaymentTransitionService transitions;
    private PaymentTransitionStore store;
    private PaymentSettlementService settlement;
    private PaymentWebhookService webhooks;
    private PayOSPaymentClient client;
    private OrderService orderService;
    private OrderStatusService statuses;
    private MockMvc mvc;
    private Long orderId, attemptId, userId, productId, code;
    private String link, voucher, key, time;
    private LocalDateTime originalExpiry;

    @BeforeAll
    static void start() throws Exception {
        try (var c = connect(); var s = c.createStatement()) {
            s.execute("CREATE DATABASE `" + SCHEMA + "` CHARACTER SET utf8mb4");
        }
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(Config.class);
        context.refresh();
    }

    @AfterAll
    static void stop() throws Exception {
        if (context != null) context.close();
        if (!SCHEMA.matches("fix057_test_[0-9a-f]{32}")) throw new IllegalStateException();
        try (var c = connect(); var s = c.createStatement()) { s.execute("DROP DATABASE `" + SCHEMA + "`"); }
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection("jdbc:mysql://127.0.0.1:3306/",
                System.getProperty("fix057.mysql.user", "root"), System.getProperty("fix057.mysql.password", ""));
    }

    @BeforeEach
    void fixture() {
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        orders = context.getBean(OrderRepository.class);
        attempts = context.getBean(PaymentAttemptRepository.class);
        operations = context.getBean(PaymentMethodTransitionRepository.class);
        events = context.getBean(PaymentEventRepository.class);
        transitions = context.getBean(PaymentTransitionService.class);
        store = context.getBean(PaymentTransitionStore.class);
        settlement = context.getBean(PaymentSettlementService.class);
        webhooks = context.getBean(PaymentWebhookService.class);
        client = context.getBean(PayOSPaymentClient.class);
        orderService = context.getBean(OrderService.class);
        statuses = context.getBean(OrderStatusService.class);
        reset(client, orderService);
        key = UUID.randomUUID().toString();
        time = LocalDateTime.now().minusSeconds(5).withNano(0).toString();
        originalExpiry = LocalDateTime.now().plusMinutes(15).withNano(0);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        tx.executeWithoutResult(s -> createFixture());
    }

    private void createFixture() {
        var name = UUID.randomUUID().toString();
        var owner = context.getBean(UserRepository.class).save(User.builder().username(name)
                .email(name + "@test.invalid").password("test-only").role(Role.ROLE_USER).build());
        userId = owner.getId();
        var product = context.getBean(ProductRepository.class).save(Product.builder().name("Vợt kiểm thử")
                .brand("Test").price(new BigDecimal("100000")).stock(9).reservedStock(1).build());
        productId = product.getId();
        voucher = UUID.randomUUID().toString();
        context.getBean(VoucherRepository.class).save(Voucher.builder().code(voucher).discountType("FIXED")
                .discountValue(BigDecimal.TEN).usedCount(1).maxUses(10).build());
        var order = Order.builder().user(owner).totalAmount(new BigDecimal("100000")).customerName("Khách kiểm thử")
                .shippingPhone("0900000000").shippingAddress("Địa chỉ snapshot").voucherCode(voucher)
                .shippingFee(BigDecimal.ZERO).discountAmount(BigDecimal.TEN).expiresAt(originalExpiry).build();
        order.getItems().add(OrderItem.builder().order(order).product(product).quantity(1).price(product.getPrice())
                .selectedColor("Xanh").selectedWeight("4U").selectedSize("G5").build());
        orders.saveAndFlush(order);
        orderId = order.getId(); code = 1000000000L + orderId; link = "link-" + orderId;
        order.setPayosOrderCode(code);
        createAttempt(order);
    }

    private void createAttempt(Order order) {
        var attempt = new PaymentAttempt();
        attempt.setOrder(order); attempt.setOrderCode(code); attempt.setPaymentLinkId(link);
        attempt.setIdempotencyKey(UUID.randomUUID().toString()); attempt.setAmount(new BigDecimal("100000"));
        attempt.setCheckoutUrl("https://pay.payos.vn/web/" + link); attempt.setQrPayload("fixture-QR");
        attempt.setExpiresAt(originalExpiry); attempt.setStatus(PaymentAttempt.Status.PENDING);
        attemptId = attempts.saveAndFlush(attempt).getId();
    }

    @Test @org.junit.jupiter.api.Order(1)
    void approvedMigrationIsRepeatablePreservesHistoryAndEnforcesConstraints() throws Exception {
        assertSourceColumns();
        prepareLegacySchema();
        seedLegacySources();
        assertLegacyConflictRejectsCancellationSource();
        var before = ledgerSnapshot();
        migrateAndAssertPreserved(before);
        convertLegacyEventSource("VARCHAR(32)");
        migrateAndAssertPreserved(before);
        convertLegacyEventSource("ENUM('WEBHOOK','RECONCILE_QUERY')");
        migrateAndAssertPreserved(before);
        assertSourceColumns();
        assertEquals(link, attempts.findById(attemptId).orElseThrow().getPaymentLinkId());
        assertLegacyConflictSourceSupportsNewCancellationFacts();
        safeProvider(); assertEquals(200, submit().status());
        var op = operation();
        assertThrows(org.hibernate.exception.ConstraintViolationException.class, () -> tx.executeWithoutResult(s ->
                context.getBean(EntityManager.class).createNativeQuery(
                    "UPDATE payment_method_transitions SET status='INVALID' WHERE id=:id").setParameter("id", op.getId()).executeUpdate()));
    }


    @Test
    void contextReadsSnapshotNotCatalogOrCartAndDoesNotMutate() {
        tx.executeWithoutResult(s -> context.getBean(ProductRepository.class).findById(productId).orElseThrow().setPrice(BigDecimal.ONE));
        var before = order();
        var result = store.context(orderId, userId);
        assertEquals(orderId, result.order().getId()); assertEquals("PAYOS_VIETQR", result.order().getPaymentMethod());
        assertEquals(0, new BigDecimal("100000").compareTo(result.order().getItems().get(0).getPrice()));
        assertEquals("Xanh", result.order().getItems().get(0).getSelectedColor());
        assertEquals("Địa chỉ snapshot", result.order().getShippingAddress());
        assertEquals(voucher, result.order().getVoucherCode()); assertEquals(0, result.stateVersion());
        assertTrue(result.eligibility().eligible());
        assertEquals(List.of("PAYOS_VIETQR", "COD"), result.eligibility().allowedMethods());
        assertNull(result.operation()); assertEquals(before.getCheckoutRevision(), order().getCheckoutRevision());
        assertInventory(9, 1, 1); verifyNoInteractions(client);
    }

    @ParameterizedTest @EnumSource(value = OrderStatus.class, names = {"PAID","SHIPPING","COMPLETED","CANCELLED"})
    void terminalOrderReadableButNotChangeable(OrderStatus state) {
        tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow().setStatus(state));
        assertFalse(store.context(orderId, userId).eligibility().eligible());
        assertError("ORDER_NOT_ELIGIBLE", this::submit);
        assertNoOperation(); assertInventory(9, 1, 1); verifyNoInteractions(client);
    }

    @ParameterizedTest @EnumSource(value = PaymentAttempt.Status.class, names = {"PENDING","FAILED","EXPIRED","CANCELLED"})
    void localCandidateEnumsStillRequireSignedTerminalProof(PaymentAttempt.Status state) {
        setAttempt(state); when(client.queryPayment(code)).thenReturn(zero("EXPIRED"));
        assertEquals(200, submit().status()); assertApplied("EXPIRED");
        verify(client, times(1)).queryPayment(code); verify(client, never()).cancelPayment(any());
    }

    @ParameterizedTest @EnumSource(value = PaymentAttempt.Status.class, names = {"CREATING","PAID","NEEDS_REVIEW"})
    void forbiddenAttemptIsRejectedBeforeIntentOrProvider(PaymentAttempt.Status state) {
        setAttempt(state);
        var expected = state == PaymentAttempt.Status.CREATING ? "PAYMENT_LINK_UNRESOLVED"
                : state == PaymentAttempt.Status.PAID ? "PAYMENT_ALREADY_SETTLED" : "PAYMENT_REQUIRES_REVIEW";
        assertError(expected, this::submit); assertNoOperation(); verifyNoInteractions(client);
    }

    @Test
    void missingAttemptOrLinkBlocksCodButStillExposesPayosContinuation() {
        tx.executeWithoutResult(s -> attempts.deleteById(attemptId));
        assertEquals(List.of("PAYOS_VIETQR"), store.context(orderId, userId).eligibility().allowedMethods());
        assertError("PAYMENT_LINK_UNRESOLVED", this::submit); assertNoOperation();
    }

    @Test
    void missingLinkAndExpiredOrderFailBeforeOperation() {
        tx.executeWithoutResult(s -> attempts.findById(attemptId).orElseThrow().setPaymentLinkId(null));
        assertError("PAYMENT_LINK_UNRESOLVED", this::submit);
        tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow().setExpiresAt(LocalDateTime.now().minusSeconds(1)));
        assertError("ORDER_NOT_ELIGIBLE", this::submit); assertNoOperation(); assertInventory(9, 1, 1);
    }

    @Test
    void transitionPreservesIdentitySnapshotsAndExactlyOnceResources() {
        var before = store.context(orderId, userId); var old = attempts.findById(attemptId).orElseThrow();
        safeProvider(); var response = submit();
        assertEquals(200, response.status()); assertFalse(response.body().replay()); assertApplied("CANCELLED");
        assertEquals(before.order().getItems().get(0).getId(), response.body().order().getItems().get(0).getId());
        assertEquals(old.getIdempotencyKey(), attempts.findById(attemptId).orElseThrow().getIdempotencyKey());
        assertEquals(old.getCheckoutUrl(), attempts.findById(attemptId).orElseThrow().getCheckoutUrl());
        assertEquals(originalExpiry, attempts.findById(attemptId).orElseThrow().getExpiresAt());
        assertEquals(2, response.body().stateVersion()); assertEquals(0, response.body().operation().expectedStateVersion());
        assertNotNull(operation().getResult()); assertTrue(operation().getEvidenceHistory().contains("PROVIDER_CANCEL"));
        verify(client, times(2)).queryPayment(code); verify(client, times(1)).cancelPayment(code);
        verify(orderService, never()).createOrder(any(), any(), any()); assertInventory(9, 1, 1);
    }

    @Test
    void sameIntentReplaysWithoutNetworkAndChangedBodyConflicts() {
        safeProvider(); var first = submit(); var replay = submit();
        assertTrue(replay.body().replay()); assertEquals(first.body().operation().operationId(), replay.body().operation().operationId());
        assertEquals(first.body().stateVersion(), replay.body().stateVersion());
        assertError("IDEMPOTENCY_CONFLICT", () -> transitions.submit(orderId, userId, key, body("COD", 1)));
        assertError("IDEMPOTENCY_CONFLICT", () -> transitions.submit(orderId, userId, key, body("PAYOS_VIETQR", 0)));
        assertError("PAYMENT_TRANSITION_CONFLICT", () -> transitions.submit(orderId, userId, UUID.randomUUID().toString(), body("COD", 0)));
        verify(client, times(1)).cancelPayment(code); assertInventory(9, 1, 1);
    }

    @Test
    void staleVersionDoesNotPrepareAndCodRoundTripIsOutOfScope() {
        assertError("STALE_ORDER_STATE", () -> transitions.submit(orderId, userId, key, body("COD", 1)));
        assertNoOperation();
        assertError("PAYMENT_METHOD_TRANSITION_OUT_OF_SCOPE", () -> transitions.submit(orderId, userId, key, body("PAYOS_VIETQR", 0)));
        tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow().setPaymentMethod("COD"));
        assertError("PAYMENT_METHOD_TRANSITION_OUT_OF_SCOPE", () -> transitions.submit(orderId, userId, key, body("PAYOS_VIETQR", 0)));
        assertError("ORDER_NOT_ELIGIBLE", this::submit); assertNoOperation(); verifyNoInteractions(client);
    }

    @Test
    void processingReturns202AndRecoveryUsesOriginalBodyNotNewVersion() {
        when(client.queryPayment(code)).thenReturn(zero("PROCESSING"), zero("CANCELLED"));
        assertEquals(202, submit().status()); assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        var restored = store.context(orderId, userId).operation();
        assertEquals(key, restored.idempotencyKey()); assertEquals(0, restored.expectedStateVersion());
        assertError("IDEMPOTENCY_CONFLICT", () -> transitions.submit(orderId, userId, key, body("COD", 1)));
        expireLease(); assertEquals(200, submit().status()); assertInventory(9, 1, 1);
    }

    @ParameterizedTest @ValueSource(ints = {502,503,504})
    void upstreamFailuresPreserveIntentAndRecoverByQuery(int status) {
        when(client.queryPayment(code)).thenThrow(new PaymentLinkException(status, "PAYOS_UNAVAILABLE", "fixture"));
        var error = assertThrows(PaymentLinkException.class, this::submit); assertEquals(status, error.getStatus());
        assertEquals(PaymentMethodTransition.Status.VERIFYING, operation().getStatus());
        assertEquals("PAYOS_VIETQR", order().getPaymentMethod()); assertInventory(9, 1, 1);
        doReturn(zero("CANCELLED")).when(client).queryPayment(code);
        assertEquals(200, submit().status()); verify(client, never()).cancelPayment(any());
    }

    @Test
    void cancelTimeoutDoesNotImplyFailureOrSuccessAndRetryQueriesFirst() {
        when(client.queryPayment(code)).thenReturn(zero("PENDING"), zero("CANCELLED"));
        when(client.cancelPayment(code)).thenThrow(new PaymentLinkException(504, "PAYOS_UNAVAILABLE", "fixture"));
        assertEquals(504, assertThrows(PaymentLinkException.class, this::submit).getStatus());
        assertEquals(PaymentMethodTransition.Status.VERIFYING, operation().getStatus()); assertInventory(9, 1, 1);
        assertEquals(200, submit().status()); verify(client, times(1)).cancelPayment(code);
    }

    @Test
    void failureAfterSignedCancelKeepsIntentAndRequiresNewQuery() {
        when(client.queryPayment(code)).thenReturn(zero("PENDING")).thenThrow(
                new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "fixture")).thenReturn(zero("CANCELLED"));
        when(client.cancelPayment(code)).thenReturn(zero("CANCELLED"));
        assertEquals(503, assertThrows(PaymentLinkException.class, this::submit).getStatus());
        assertEquals("PAYOS_VIETQR", order().getPaymentMethod()); assertTrue(operation().getEvidenceHistory().contains("PROVIDER_CANCEL"));
        assertEquals(200, submit().status()); verify(client, times(1)).cancelPayment(code); assertApplied("CANCELLED");
    }

    @Test
    void notFoundKnownLinkAndUnknownStatusNeverCommitCod() {
        when(client.queryPayment(code)).thenReturn(null);
        assertEquals(503, assertThrows(PaymentLinkException.class, this::submit).getStatus());
        when(client.queryPayment(code)).thenReturn(zero("UNKNOWN"));
        assertEquals(502, assertThrows(PaymentLinkException.class, this::submit).getStatus());
        assertEquals(PaymentMethodTransition.Status.VERIFYING, operation().getStatus()); assertInventory(9, 1, 1);
    }

    @Test
    void cancellationRejectedOrStillActiveNeverCommitsCod() {
        when(client.queryPayment(code)).thenReturn(zero("FAILED"));
        when(client.cancelPayment(code)).thenThrow(new PaymentLinkException(503, "PAYOS_UNAVAILABLE", "fixture"));
        assertEquals(503, assertThrows(PaymentLinkException.class, this::submit).getStatus());
        doReturn(zero("PENDING")).when(client).cancelPayment(code);
        assertEquals(202, submit().status()); assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        assertInventory(9, 1, 1);
    }

    @Test
    void moneyBeforeApplySettlesPayosAndRejectsOperationExactlyOnce() {
        when(client.queryPayment(code)).thenReturn(paid("QUERY", 100000));
        assertError("PAYMENT_ALREADY_SETTLED", this::submit);
        assertEquals(OrderStatus.PAID, order().getStatus()); assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        assertEquals(PaymentMethodTransition.Status.REJECTED, operation().getStatus());
        assertEquals(1, receipts().size()); assertInventory(9, 0, 1);
        assertError("PAYMENT_ALREADY_SETTLED", this::submit); verify(client, times(1)).queryPayment(code);
    }

    @Test
    void partialMoneyAndIdentityMismatchPersistFactsAndReviewInsteadOfCod() {
        when(client.queryPayment(code)).thenReturn(paid("PARTIAL", 1000));
        assertError("PAYMENT_REQUIRES_REVIEW", this::submit);
        assertEquals(1, receipts().size()); assertEquals(PaymentMethodTransition.Status.NEEDS_REVIEW, operation().getStatus());
        assertInventory(9, 1, 1); assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
    }

    @Test
    void signedIdentityMismatchDoesNotBindWrongOrderOrDiscardTransaction() {
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"),
                "wrong-link", "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of(transaction("WRONG", 100000))));
        assertError("PAYMENT_REQUIRES_REVIEW", this::submit);
        assertTrue(events.findAll().stream().anyMatch(e -> "WRONG".equals(e.getReference()) && e.getPaymentAttempt() == null));
        assertInventory(9, 1, 1);
    }

    @Test
    void aggregateMoneyWithoutTransactionsIsReviewAndNeverSafeZero() {
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "CANCELLED", BigDecimal.TEN, new BigDecimal("99990"), List.of()));
        assertError("PAYMENT_REQUIRES_REVIEW", this::submit);
        assertEquals(PaymentAttempt.Status.NEEDS_REVIEW, attempts.findById(attemptId).orElseThrow().getStatus());
        assertInventory(9, 1, 1);
    }

    @Test
    void signedCancelTransactionsAreLedgerFactsWithProviderCancelSource() {
        when(client.queryPayment(code)).thenReturn(zero("PENDING"));
        when(client.cancelPayment(code)).thenReturn(paid("CANCEL-PAID", 100000));
        assertError("PAYMENT_ALREADY_SETTLED", this::submit);
        assertEquals(PaymentEvent.Source.PROVIDER_CANCEL, receipts().get(0).getSource());
        assertInventory(9, 0, 1);
    }

    @Test
    void lateWebhookAfterCodPreservesHistoryAndBlocksDeliveryAndCancellation() {
        safeProvider(); var applied = submit(); var result = operation().getResult();
        webhooks.accept(payload("LATE")); webhooks.accept(payload("LATE"));
        assertLate(); assertEquals(result, operation().getResult()); assertEquals(1, receipts().size());
        var replay = submit(); assertEquals(200, replay.status()); assertTrue(replay.body().replay());
        assertEquals(PaymentAttempt.Status.NEEDS_REVIEW, replay.body().payment().status());
        assertEquals(applied.body().operation().operationId(), replay.body().operation().operationId());
        assertError("PAYMENT_REQUIRES_REVIEW", () -> orderService.cancelOrder(orderId, userId, false));
        when(client.queryPayment(code)).thenReturn(zero("CANCELLED"));
        assertError("PAYMENT_REQUIRES_REVIEW", () -> statuses.update(orderId, OrderStatus.SHIPPING));
        assertInventory(9, 1, 1);
    }

    @Test
    void lateReconcileAndDuplicateDifferentSourcesKeepOneReceiptAndCodState() {
        safeProvider(); submit();
        settlement.query(attemptId, paid("LATE-Q", 100000));
        webhooks.accept(payload("LATE-Q"));
        assertLate(); assertEquals(1, receipts().size()); assertInventory(9, 1, 1);
    }

    @Test
    void transitionedCodDeliveryAndCompletionQueryRetiredLinkAndConsumeOnce() {
        safeProvider(); submit();
        when(client.queryPayment(code)).thenReturn(zero("CANCELLED"));
        assertEquals("SHIPPING", statuses.update(orderId, OrderStatus.SHIPPING).getStatus());
        assertInventory(9, 0, 1);
        assertEquals("COMPLETED", statuses.update(orderId, OrderStatus.COMPLETED).getStatus());
        assertInventory(9, 0, 1);
        webhooks.accept(payload("POST-DELIVERY"));
        assertLate(); assertEquals(OrderStatus.COMPLETED, order().getStatus()); assertInventory(9, 0, 1);
    }

    @Test
    void deliveryProofMoneyOrProviderUnavailableBlocksBeforeStockConsumption() {
        safeProvider(); submit();
        when(client.queryPayment(code)).thenThrow(new PaymentLinkException(504, "PAYOS_UNAVAILABLE", "fixture"));
        assertEquals(504, assertThrows(PaymentLinkException.class, () -> statuses.update(orderId, OrderStatus.SHIPPING)).getStatus());
        assertInventory(9, 1, 1);
        doReturn(paid("DELIVERY", 100000)).when(client).queryPayment(code);
        assertError("PAYMENT_REQUIRES_REVIEW", () -> statuses.update(orderId, OrderStatus.SHIPPING));
        assertLate(); assertInventory(9, 1, 1);
    }

    @Test
    void nativeCodUsesExistingLifecycleWithoutProviderCall() {
        tx.executeWithoutResult(s -> { var order = orders.findById(orderId).orElseThrow(); order.setPaymentMethod("COD"); order.setExpiresAt(null); });
        assertEquals("SHIPPING", statuses.update(orderId, OrderStatus.SHIPPING).getStatus());
        assertInventory(9, 0, 1); verifyNoInteractions(client);
    }

    @Test
    void appliedCodCancellationRestoresOnceAndExpiryNeverCancelsIt() {
        safeProvider(); submit();
        orderService.expireOrder(orderId); assertEquals(OrderStatus.PENDING, order().getStatus());
        orderService.cancelOrder(orderId, userId, false); assertEquals(OrderStatus.CANCELLED, order().getStatus());
        assertInventory(10, 0, 0);
        orderService.cancelOrder(orderId, userId, false);
        assertInventory(10, 0, 0);
    }

    @Test
    void ownershipIsCheckedBeforeReplayEvenForAdminAndAnonymousUsesErrorContract() throws Exception {
        safeProvider(); submit();
        for (String suffix : new String[]{"/checkout-context","/payment-method-transitions"}) {
            var request = suffix.contains("context") ? get("/api/orders/" + orderId + suffix) : post("/api/orders/" + orderId + suffix)
                    .header("Idempotency-Key", key).contentType("application/json").content(body("COD", 0).toString());
            mvc.perform(request).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.code").value("UNAUTHENTICATED")).andExpect(jsonPath("$.errors").isMap());
            mvc.perform(request.with(user(principal(userId + 10000, Role.ROLE_ADMIN)))).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("NOT_ORDER_OWNER")).andExpect(jsonPath("$.order").doesNotExist());
        }
        assertEquals(403, assertThrows(PaymentLinkException.class,
                () -> transitions.submit(orderId, userId + 10000, key, body("COD", 0))).getStatus());
    }

    @Test
    void controllersReturnActualContextAndTransitionShape() throws Exception {
        mvc.perform(get("/api/orders/{id}/checkout-context", orderId).with(user(principal(userId, Role.ROLE_USER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.order.id").value(orderId))
                .andExpect(jsonPath("$.payment.id").value(attemptId)).andExpect(jsonPath("$.eligibility.eligible").value(true))
                .andExpect(jsonPath("$.stateVersion").value(0)).andExpect(jsonPath("$.operation").isEmpty());
        safeProvider();
        mvc.perform(post("/api/orders/{id}/payment-method-transitions", orderId).with(user(principal(userId, Role.ROLE_USER)))
                .header("Idempotency-Key", key).contentType("application/json").content(body("COD", 0).toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.operation.sourceOrderId").value(orderId))
                .andExpect(jsonPath("$.operation.effectiveOrderId").value(orderId)).andExpect(jsonPath("$.operation.status").value("APPLIED"))
                .andExpect(jsonPath("$.order.paymentMethod").value("COD")).andExpect(jsonPath("$.stateVersion").value(2))
                .andExpect(jsonPath("$.replay").value(false)).andExpect(jsonPath("$.operation.runnerEpoch").doesNotExist());
    }

    @Test
    void pendingControllerHasRetryAfterAndNoSuccessClaim() throws Exception {
        when(client.queryPayment(code)).thenReturn(zero("PROCESSING"));
        mvc.perform(post("/api/orders/{id}/payment-method-transitions", orderId).with(user(principal(userId, Role.ROLE_USER)))
                .header("Idempotency-Key", key).contentType("application/json").content(body("COD", 0).toString()))
                .andExpect(status().isAccepted()).andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.operation.status").value("VERIFYING")).andExpect(jsonPath("$.order.paymentMethod").value("PAYOS_VIETQR"));
    }

    @ParameterizedTest @ValueSource(strings = {"-1","0","9007199254740992","abc","9223372036854775808"})
    void controllerRejectsInvalidCanonicalId(String id) throws Exception {
        mvc.perform(get("/api/orders/" + id + "/checkout-context").with(user(principal(userId, Role.ROLE_USER))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_ORDER_ID"));
    }

    @ParameterizedTest @MethodSource("invalidBodies")
    void strictRequestRejectsUntrustedFieldsTypesAndMethods(String body, String code) throws Exception {
        mvc.perform(post("/api/orders/{id}/payment-method-transitions", orderId).with(user(principal(userId, Role.ROLE_USER)))
                .header("Idempotency-Key", key).contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.path").value("/api/orders/" + orderId + "/payment-method-transitions"))
                .andExpect(jsonPath("$.errors").isMap());
        assertNoOperation(); verifyNoInteractions(client);
    }

    static Stream<Arguments> invalidBodies() {
        return Stream.of(Arguments.of("{", "INVALID_TRANSITION_INPUT"), Arguments.of("null","INVALID_TRANSITION_INPUT"),
                Arguments.of("[]","INVALID_TRANSITION_INPUT"), Arguments.of("{}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"COD\",\"expectedStateVersion\":0,\"amount\":1}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"COD\",\"expectedStateVersion\":-1}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"COD\",\"expectedStateVersion\":9007199254740992}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"COD\",\"expectedStateVersion\":0.0}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"COD\",\"expectedStateVersion\":\"0\"}","INVALID_TRANSITION_INPUT"),
                Arguments.of("{\"targetPaymentMethod\":\"OTHER\",\"expectedStateVersion\":0}","INVALID_PAYMENT_METHOD"));
    }

    @ParameterizedTest @ValueSource(strings = {"","invalid","00000000-0000-0000-0000-00000000000z"})
    void missingOrInvalidIdempotencyKeyDoesNotCreateIntent(String invalid) {
        assertEquals(400, assertThrows(PaymentLinkException.class, () -> transitions.submit(orderId, userId, invalid, body("COD", 0))).getStatus());
        assertNoOperation(); verifyNoInteractions(client);
    }

    @Test
    void realMissingOrderReturns404WithoutProvider() throws Exception {
        mvc.perform(get("/api/orders/9007199254740991/checkout-context").with(user(principal(userId, Role.ROLE_USER))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
        verifyNoInteractions(client);
    }


    @Test
    void concurrentSameIntentReturnsPendingToSecondRunnerAndOneOperation() throws Exception {
        withPausedQuery(() -> {
            var pending = submit(); assertEquals(202, pending.status()); assertTrue(pending.body().replay());
            assertEquals(PaymentMethodTransition.Status.VERIFYING, operation().getStatus());
        }, zero("CANCELLED"), null);
        assertApplied("CANCELLED"); verify(client, times(1)).queryPayment(code); assertEquals(1, operation().getRunnerEpoch());
    }

    @Test
    void concurrentDifferentIntentCannotCreateSecondOperation() throws Exception {
        withPausedQuery(() -> assertError("PAYMENT_TRANSITION_CONFLICT",
                () -> transitions.submit(orderId, userId, UUID.randomUUID().toString(), body("COD", 0))), zero("CANCELLED"), null);
        assertApplied("CANCELLED"); assertInventory(9, 1, 1);
    }

    @Test
    void paidWebhookWinsDuringProviderQueryAndCodNeverApplies() throws Exception {
        withPausedQuery(() -> webhooks.accept(payload("RACE-WEBHOOK")), zero("CANCELLED"), "PAYMENT_ALREADY_SETTLED");
        assertEquals(OrderStatus.PAID, order().getStatus()); assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        assertEquals(PaymentMethodTransition.Status.REJECTED, operation().getStatus()); assertInventory(9, 0, 1);
    }

    @Test
    void reconcileWinsDuringProviderQueryAndCodNeverApplies() throws Exception {
        withPausedQuery(() -> settlement.query(attemptId, paid("RACE-RECONCILE", 100000)),
                zero("CANCELLED"), "PAYMENT_ALREADY_SETTLED");
        assertEquals(OrderStatus.PAID, order().getStatus()); assertInventory(9, 0, 1); assertEquals(1, receipts().size());
    }

    @Test
    void manualCancelAndStatusMutationCannotReleaseDuringVerifying() throws Exception {
        withPausedQuery(() -> {
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> orderService.cancelOrder(orderId, userId, false));
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> statuses.update(orderId, OrderStatus.SHIPPING));
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> statuses.update(orderId, OrderStatus.CANCELLED));
            assertInventory(9, 1, 1);
        }, zero("CANCELLED"), null);
        assertApplied("CANCELLED");
    }

    @Test
    void createOrSavePaymentLinkBlockedWhileOperationExists() throws Exception {
        withPausedQuery(() -> {
            var links = context.getBean(PaymentAttemptStore.class);
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> links.prepare(orderId, userId, UUID.randomUUID().toString()));
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> links.saveResult(orderId, userId,
                    new PayOSPaymentClient.Result(code, new BigDecimal("100000"), link, null, null), false));
            assertInventory(9, 1, 1);
        }, zero("CANCELLED"), null);
        assertApplied("CANCELLED");
    }

    @Test
    void creatingLinkRaceIsRejectedWithoutTransitionAndExistingLifecycleRemainsAvailable() {
        setAttempt(PaymentAttempt.Status.CREATING);
        assertError("PAYMENT_LINK_UNRESOLVED", this::submit); assertNoOperation();
        context.getBean(PaymentAttemptStore.class).saveResult(orderId, userId,
                new PayOSPaymentClient.Result(code, new BigDecimal("100000"), link, "https://pay.payos.vn/web/" + link, "QR"), true);
        safeProvider(); assertEquals(200, submitWithVersion(1).status()); assertApplied("CANCELLED");
    }

    @Test
    void expiredOperationReleasesOnceAndNeverRevivesOrder() throws Exception {
        tx.executeWithoutResult(s -> {
            var expiry = LocalDateTime.now().plusSeconds(2);
            orders.findById(orderId).orElseThrow().setExpiresAt(expiry);
            attempts.findById(attemptId).orElseThrow().setExpiresAt(expiry);
        });
        store.prepare(orderId, userId, key, com.sports.dto.PaymentTransitionRequest.parse(body("COD", 0)));
        var runner = store.claim(orderId, userId);
        while (operation().getOriginalExpiresAt().isAfter(LocalDateTime.now())) Thread.sleep(30);
        assertTrue(orderService.expireOrder(orderId)); assertFalse(orderService.expireOrder(orderId));
        var outcome = store.observe(runner, zero("CANCELLED"), PaymentEvent.Source.RECONCILE_QUERY, true);
        assertEquals(409, outcome.status()); assertEquals(PaymentMethodTransition.Status.REJECTED, operation().getStatus());
        assertEquals(OrderStatus.CANCELLED, order().getStatus()); assertInventory(10, 0, 0);
    }

    @Test
    void finalizeAfterDeadlineExpiresOrderWithoutSchedulerRace() throws Exception {
        tx.executeWithoutResult(s -> {
            var expiry = LocalDateTime.now().plusSeconds(2);
            orders.findById(orderId).orElseThrow().setExpiresAt(expiry);
            attempts.findById(attemptId).orElseThrow().setExpiresAt(expiry);
        });
        store.prepare(orderId, userId, key, com.sports.dto.PaymentTransitionRequest.parse(body("COD", 0)));
        var runner = store.claim(orderId, userId);
        while (operation().getOriginalExpiresAt().isAfter(LocalDateTime.now())) Thread.sleep(30);
        assertEquals(409, store.observe(runner, zero("CANCELLED"), PaymentEvent.Source.RECONCILE_QUERY, true).status());
        assertEquals(OrderStatus.CANCELLED, order().getStatus()); assertInventory(10, 0, 0);
    }

    @Test
    void staleRunnerCannotApplyButItsVerifiedMoneyIsStillPersisted() {
        store.prepare(orderId, userId, key, com.sports.dto.PaymentTransitionRequest.parse(body("COD", 0)));
        var oldRunner = store.claim(orderId, userId); expireLease(); var current = store.claim(orderId, userId);
        assertTrue(current.epoch() > oldRunner.epoch());
        assertEquals(202, store.observe(oldRunner, zero("CANCELLED"), PaymentEvent.Source.RECONCILE_QUERY, true).status());
        assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        assertEquals(409, store.observe(oldRunner, paid("STALE-RUNNER", 100000), PaymentEvent.Source.RECONCILE_QUERY, true).status());
        assertEquals(1, receipts().size()); assertEquals(OrderStatus.PAID, order().getStatus()); assertInventory(9, 0, 1);
    }

    @Test
    void claimLeaseAndReadDoNotBumpVersionAndTransactionTouchesOnce() {
        store.prepare(orderId, userId, key, com.sports.dto.PaymentTransitionRequest.parse(body("COD", 0)));
        assertEquals(1, order().getCheckoutRevision());
        var runner = store.claim(orderId, userId); store.renew(runner); store.context(orderId, userId);
        assertEquals(1, order().getCheckoutRevision());
        store.observe(runner, paid("VERSION", 100000), PaymentEvent.Source.RECONCILE_QUERY, true);
        assertEquals(2, order().getCheckoutRevision());
        settlement.query(attemptId, paid("VERSION", 100000));
        assertEquals(2, order().getCheckoutRevision()); assertInventory(9, 0, 1);
    }

    @Test
    void lostResponseRecoveryFindsOperationAndUsesSameOrderAndIntent() {
        store.prepare(orderId, userId, key, com.sports.dto.PaymentTransitionRequest.parse(body("COD", 0)));
        store.claim(orderId, userId);
        var recovered = store.context(orderId, userId);
        assertEquals(key, recovered.operation().idempotencyKey()); assertEquals(orderId, recovered.operation().sourceOrderId());
        assertEquals(202, submit().status()); expireLease();
        when(client.queryPayment(code)).thenReturn(zero("CANCELLED"));
        assertEquals(200, submit().status()); assertInventory(9, 1, 1);
    }

    @Test
    void providerAcceptedCancelThenLocalCommitFailureRollsBackAndRetryRecovers() {
        safeProvider();
        doAnswer(invocation -> {
            var response = invocation.callRealMethod();
            if ("COD".equals(((Order) invocation.getArgument(0)).getPaymentMethod())) failCommit();
            return response;
        }).when(orderService).snapshot(any());
        assertThrows(IllegalStateException.class, this::submit);
        assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        assertEquals(PaymentMethodTransition.Status.VERIFYING, operation().getStatus());
        assertNull(operation().getResult()); assertInventory(9, 1, 1);
        doCallRealMethod().when(orderService).snapshot(any()); expireLease();
        assertEquals(200, submit().status()); verify(client, times(1)).cancelPayment(code);
    }

    @Test
    void webhookBetweenDeliveryQueryAndStatusLockPreventsStockConsumption() {
        safeProvider(); submit();
        doAnswer(invocation -> {
            var pool = Executors.newSingleThreadExecutor();
            try { pool.submit(() -> webhooks.accept(payload("DELIVERY-RACE"))).get(10, TimeUnit.SECONDS); }
            finally { pool.shutdownNow(); }
            return invocation.callRealMethod();
        }).when(orderService).updateOrderStatus(eq(orderId), eq(OrderStatus.SHIPPING), any());
        when(client.queryPayment(code)).thenReturn(zero("CANCELLED"));
        assertError("PAYMENT_REQUIRES_REVIEW", () -> statuses.update(orderId, OrderStatus.SHIPPING));
        assertLate(); assertInventory(9, 1, 1);
    }

    @Test
    void deliveryUnknownStatusAndKnownLink404AreBlockedWithoutResources() {
        safeProvider(); submit();
        when(client.queryPayment(code)).thenReturn(zero("UNKNOWN"));
        assertEquals(502, assertThrows(PaymentLinkException.class, () -> statuses.update(orderId, OrderStatus.SHIPPING)).getStatus());
        when(client.queryPayment(code)).thenReturn(null);
        assertEquals(503, assertThrows(PaymentLinkException.class, () -> statuses.update(orderId, OrderStatus.SHIPPING)).getStatus());
        assertInventory(9, 1, 1);
    }

    @Test
    void missingReservationFailsBeforePrepareOrProvider() {
        tx.executeWithoutResult(s -> context.getBean(ProductRepository.class).findById(productId).orElseThrow().setReservedStock(0));
        assertError("ORDER_NOT_ELIGIBLE", this::submit); assertNoOperation(); verifyNoInteractions(client);
    }

    private PaymentTransitionStore.Outcome submitWithVersion(long version) {
        return transitions.submit(orderId, userId, key, body("COD", version));
    }

    private void withPausedQuery(Runnable during, PayOSPaymentClient.Query proof, String error) throws Exception {
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        when(client.queryPayment(code)).thenAnswer(invocation -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            entered.countDown(); assertTrue(release.await(10, TimeUnit.SECONDS)); return proof;
        });
        var pool = Executors.newSingleThreadExecutor();
        try {
            var result = pool.submit(this::submit); assertTrue(entered.await(10, TimeUnit.SECONDS));
            during.run(); release.countDown();
            if (error == null) assertEquals(200, result.get(15, TimeUnit.SECONDS).status());
            else {
                var cause = assertThrows(ExecutionException.class, () -> result.get(15, TimeUnit.SECONDS)).getCause();
                assertInstanceOf(PaymentLinkException.class, cause); assertEquals(error, ((PaymentLinkException) cause).getCode());
            }
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    private void failCommit() {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void beforeCommit(boolean readOnly) { throw new IllegalStateException("fixture-only commit failure"); }
        });
    }
    private void assertLegacyConflictSourceSupportsNewCancellationFacts() {
        var ledger = context.getBean(PaymentLedgerService.class);
        var first = new PaymentEvidence(link, code, "MIGRATION-SOURCE", BigDecimal.TEN, "VND", time, false, PaymentEvent.Source.WEBHOOK);
        var incoming = new PaymentEvidence(link, code, "MIGRATION-SOURCE", BigDecimal.ONE, "VND", time, true, PaymentEvent.Source.PROVIDER_CANCEL);
        tx.executeWithoutResult(s -> ledger.record(first, null));
        var conflict = tx.execute(s -> ledger.record(incoming, null));
        assertTrue(conflict.conflict());
        assertEquals(PaymentEvent.Source.PROVIDER_CANCEL, context.getBean(PaymentEventConflictRepository.class).findAll()
                .stream().filter(c -> c.getPaymentEvent().getId().equals(conflict.event().getId())).findFirst().orElseThrow().getSource());
        var cancelled = new PaymentEvidence(link, code, "MIGRATION-CANCEL", BigDecimal.ONE, "VND", time, true, PaymentEvent.Source.PROVIDER_CANCEL);
        var receipt = tx.execute(s -> ledger.record(cancelled, null));
        assertEquals(PaymentEvent.Source.PROVIDER_CANCEL, events.findById(receipt.event().getId()).orElseThrow().getSource());
        assertEquals(OrderStatus.PENDING, order().getStatus()); assertInventory(9, 1, 1);
    }


    private record LedgerSnapshot(List<List<String>> eventRows, List<List<String>> conflictRows,
            List<List<String>> indexes, List<List<String>> foreignKeys, List<List<String>> attributes) {}

    private void prepareLegacySchema() throws Exception {
        try (var c = context.getBean(DataSource.class).getConnection(); var s = c.createStatement()) {
            s.execute("DROP TABLE payment_method_transitions");
            s.execute("ALTER TABLE orders DROP COLUMN checkout_revision");
            s.execute(legacyEventSource("ENUM('WEBHOOK','RECONCILE_QUERY')"));
            s.execute("ALTER TABLE payment_event_conflicts MODIFY COLUMN source ENUM('WEBHOOK','RECONCILE_QUERY') "
                    + "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RECONCILE_QUERY' COMMENT 'Xung đột ''cũ'''");
            s.execute("ALTER TABLE payment_events ADD CONSTRAINT ck_legacy_event_source CHECK(source IN ('WEBHOOK','RECONCILE_QUERY'))");
            s.execute("ALTER TABLE payment_event_conflicts ADD CONSTRAINT ck_legacy_conflict_source CHECK(source IN ('WEBHOOK','RECONCILE_QUERY'))");
        }
    }

    private String legacyEventSource(String type) {
        return "ALTER TABLE payment_events MODIFY COLUMN source " + type
                + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEBHOOK' COMMENT 'Nguồn ''cũ'''";
    }

    private void convertLegacyEventSource(String type) throws Exception {
        try (var c = context.getBean(DataSource.class).getConnection(); var s = c.createStatement()) {
            s.execute(legacyEventSource(type));
        }
    }

    private void seedLegacySources() {
        var ledger = context.getBean(PaymentLedgerService.class);
        for (var source : List.of(PaymentEvent.Source.WEBHOOK, PaymentEvent.Source.RECONCILE_QUERY)) {
            var original = new PaymentEvidence(link, code, "LEGACY-" + source, BigDecimal.TEN, "VND", time, false, source);
            var changed = new PaymentEvidence(link, code, original.reference(), BigDecimal.ONE, "VND", time, true, source);
            tx.executeWithoutResult(s -> ledger.record(original, null));
            tx.executeWithoutResult(s -> assertTrue(ledger.record(changed, null).conflict()));
        }
    }


    private void assertLegacyConflictRejectsCancellationSource() throws SQLException {
        var before = ledgerSnapshot();
        var proof = new PaymentEvidence(link, code, "LEGACY-WEBHOOK", new BigDecimal("2"), "VND", time, false, PaymentEvent.Source.PROVIDER_CANCEL);
        var failure = assertThrows(org.springframework.dao.DataAccessException.class, () ->
                tx.executeWithoutResult(s -> context.getBean(PaymentLedgerService.class).record(proof, null)));
        var root = assertInstanceOf(SQLException.class, failure.getMostSpecificCause());
        assertEquals(1265, root.getErrorCode());
        assertTrue(root.getMessage().contains("source"));
        assertTrue(failure.getMessage().contains("payment_event_conflicts"));
        assertEquals(before, ledgerSnapshot()); assertInventory(9, 1, 1);
    }

    private void migrateAndAssertPreserved(LedgerSnapshot before) throws Exception {
        try (var c = context.getBean(DataSource.class).getConnection()) {
            ScriptUtils.executeSqlScript(c, new ClassPathResource("fix057_payment_transition.sql"));
            assertEquals(before, ledgerSnapshot());
            ScriptUtils.executeSqlScript(c, new ClassPathResource("fix057_payment_transition.sql"));
            assertEquals(before, ledgerSnapshot());
            assertEquals(0, order().getCheckoutRevision());
        }
    }

    private LedgerSnapshot ledgerSnapshot() throws SQLException {
        String tables = "table_schema=DATABASE() AND table_name IN ('payment_events','payment_event_conflicts')";
        return new LedgerSnapshot(rows("SELECT * FROM payment_events ORDER BY id"),
                rows("SELECT * FROM payment_event_conflicts ORDER BY id"),
                rows("SELECT table_name,index_name,non_unique,seq_in_index,column_name,collation,sub_part,index_type "
                        + "FROM information_schema.statistics WHERE " + tables + " ORDER BY table_name,index_name,seq_in_index"),
                rows("SELECT k.table_name,k.constraint_name,k.column_name,k.ordinal_position,k.referenced_table_name,"
                        + "k.referenced_column_name,r.update_rule,r.delete_rule FROM information_schema.key_column_usage k "
                        + "JOIN information_schema.referential_constraints r ON r.constraint_schema=k.constraint_schema "
                        + "AND r.constraint_name=k.constraint_name AND r.table_name=k.table_name WHERE k." + tables.replace(" AND table_name", " AND k.table_name")
                        + " ORDER BY k.table_name,k.constraint_name,k.ordinal_position"),
                rows("SELECT table_name,character_set_name,collation_name,column_default,column_comment "
                        + "FROM information_schema.columns WHERE " + tables + " AND column_name='source' ORDER BY table_name"));
    }

    private List<List<String>> rows(String sql) throws SQLException {
        var result = new ArrayList<List<String>>();
        try (var c = context.getBean(DataSource.class).getConnection(); var statement = c.createStatement(); var data = statement.executeQuery(sql)) {
            while (data.next()) {
                var values = new ArrayList<String>();
                for (int i = 1; i <= data.getMetaData().getColumnCount(); i++) values.add(data.getString(i));
                result.add(Collections.unmodifiableList(values));
            }
        }
        return result;
    }

    private void assertSourceColumns() throws SQLException {
        assertEquals(List.of(List.of("payment_event_conflicts","varchar","32","NO"),
                List.of("payment_events","varchar","32","NO")),
                rows("SELECT table_name,data_type,character_maximum_length,is_nullable FROM information_schema.columns "
                        + "WHERE table_schema=DATABASE() AND table_name IN ('payment_events','payment_event_conflicts') "
                        + "AND column_name='source' ORDER BY BINARY table_name"));
    }

    @Test
    void migrationRerunPreservesAppliedOperationResultAndRevision() throws Exception {
        safeProvider(); submit();
        var original = operation(); var before = ledgerSnapshot(); var revision = order().getCheckoutRevision();
        try (var c = context.getBean(DataSource.class).getConnection()) {
            ScriptUtils.executeSqlScript(c, new ClassPathResource("fix057_payment_transition.sql"));
            ScriptUtils.executeSqlScript(c, new ClassPathResource("fix057_payment_transition.sql"));
        }
        assertEquals(before, ledgerSnapshot()); assertEquals(revision, order().getCheckoutRevision());
        assertEquals(original.getOperationId(), operation().getOperationId()); assertEquals(original.getResult(), operation().getResult());
        assertEquals(original.getAppliedAt(), operation().getAppliedAt()); assertInventory(9, 1, 1);
    }

    @Test
    void migratedSchemaAndJpaInitializeNewOrdersAtRevisionZero() throws Exception {
        try (var c = context.getBean(DataSource.class).getConnection(); var s = c.prepareStatement(
                "INSERT INTO orders(user_id,total_amount,status) VALUES(?,1,'PENDING')", Statement.RETURN_GENERATED_KEYS)) {
            s.setLong(1, userId); s.executeUpdate();
            try (var ids = s.getGeneratedKeys()) { assertTrue(ids.next()); assertEquals(0, orders.findById(ids.getLong(1)).orElseThrow().getCheckoutRevision()); }
        }
        var created = tx.execute(s -> orders.saveAndFlush(Order.builder()
                .user(context.getBean(UserRepository.class).findById(userId).orElseThrow()).totalAmount(BigDecimal.ONE).build()));
        assertEquals(0, orders.findById(created.getId()).orElseThrow().getCheckoutRevision());
        assertInventory(9, 1, 1); assertSourceColumns();
    }


    @Test
    void realLinkRecoveryCannotSaveAfterCodTransitionCommits() throws Exception {
        String intent = attempts.findById(attemptId).orElseThrow().getIdempotencyKey();
        tx.executeWithoutResult(s -> attempts.findById(attemptId).orElseThrow().setCheckoutUrl(null));
        try (var paused = new PausedLink(true, intent)) {
            paused.awaitProvider();
            safeProvider(); assertEquals(200, submit().status());
            paused.reject("PAYMENT_TRANSITION_CONFLICT");
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> context.getBean(PaymentAttemptStore.class)
                    .saveResult(orderId, userId, createResult(), true));
        }
        assertApplied("CANCELLED");
        assertEquals(intent, attempts.findById(attemptId).orElseThrow().getIdempotencyKey());
        assertEquals(link, attempts.findById(attemptId).orElseThrow().getPaymentLinkId());
        assertEquals(originalExpiry, attempts.findById(attemptId).orElseThrow().getExpiresAt());
        verify(client, never()).create(any());
    }

    @Test
    void realProviderCreatingInFlightBlocksCodWithoutInventingAbsence() throws Exception {
        removeFixtureAttempt();
        try (var paused = new PausedLink(false, UUID.randomUUID().toString())) {
            paused.awaitProvider(); selectCreatedAttempt();
            assertEquals(PaymentAttempt.Status.CREATING, attempts.findById(attemptId).orElseThrow().getStatus());
            assertFalse(store.context(orderId, userId).eligibility().eligible());
            assertError("PAYMENT_LINK_UNRESOLVED", () -> submitWithVersion(store.context(orderId, userId).stateVersion()));
            assertNoOperation(); assertInventory(9, 1, 1);
            assertEquals(201, paused.complete().status());
        }
        assertEquals(PaymentAttempt.Status.PENDING, attempts.findById(attemptId).orElseThrow().getStatus());
        assertEquals("PAYOS_VIETQR", order().getPaymentMethod());
        verify(client, never()).cancelPayment(any()); assertInventory(9, 1, 1);
    }

    @Test
    void realProviderCreateWinnerMustBeRetiredAndVerifiedBeforeCod() throws Exception {
        removeFixtureAttempt();
        try (var paused = new PausedLink(false, UUID.randomUUID().toString())) {
            paused.awaitProvider(); selectCreatedAttempt();
            assertError("PAYMENT_LINK_UNRESOLVED", () -> submitWithVersion(store.context(orderId, userId).stateVersion()));
            assertNoOperation(); assertEquals(201, paused.complete().status());
        }
        var created = attempts.findById(attemptId).orElseThrow();
        assertEquals(link, created.getPaymentLinkId()); assertEquals("fixture-QR", created.getQrPayload());
        safeProvider(); assertEquals(200, submitWithVersion(store.context(orderId, userId).stateVersion()).status());
        assertApplied("CANCELLED"); assertEquals(created.getCheckoutUrl(), attempts.findById(attemptId).orElseThrow().getCheckoutUrl());
        verify(client, times(1)).create(any()); verify(client, times(1)).cancelPayment(code);
        verify(client, times(2)).queryPayment(code);
    }


    @Test
    void realAmbiguousCreateAndQueryRecoveryCannotAssumeNoPayableLink() {
        removeFixtureAttempt(); String intent = UUID.randomUUID().toString();
        when(client.create(any())).thenThrow(new PaymentLinkException(504, "PAYMENT_PROVIDER_TIMEOUT", "Provider giả hết thời gian"));
        assertEquals(504, assertThrows(PaymentLinkException.class, () -> links().create(orderId, userId, intent)).getStatus());
        selectCreatedAttempt();
        assertError("PAYMENT_LINK_UNRESOLVED", () -> submitWithVersion(store.context(orderId, userId).stateVersion()));
        when(client.query(code)).thenReturn(null);
        assertEquals(202, links().create(orderId, userId, intent).status());
        when(client.query(code)).thenReturn(new PayOSPaymentClient.Result(code, new BigDecimal("100000"), link, null, null));
        assertEquals(202, links().create(orderId, userId, intent).status());
        assertEquals(PaymentAttempt.Status.CREATING, attempts.findById(attemptId).orElseThrow().getStatus());
        assertEquals(link, attempts.findById(attemptId).orElseThrow().getPaymentLinkId());
        assertEquals(intent, attempts.findById(attemptId).orElseThrow().getIdempotencyKey());
        assertError("PAYMENT_LINK_UNRESOLVED", () -> submitWithVersion(store.context(orderId, userId).stateVersion()));
        assertNoOperation(); assertInventory(9, 1, 1);
        verify(client, times(1)).create(any()); verify(client, times(2)).query(code); verify(client, never()).cancelPayment(any());
    }

    @Test
    void realSameFix002RetryAfterCodNeverCreatesAnotherAttemptOrLink() {
        var original = attempts.findById(attemptId).orElseThrow();
        safeProvider(); assertEquals(200, submit().status());
        assertError("ORDER_NOT_PAYABLE", () -> links().create(orderId, userId, original.getIdempotencyKey()));
        var retained = attempts.findByOrderId(orderId).orElseThrow();
        assertEquals(original.getId(), retained.getId()); assertEquals(original.getIdempotencyKey(), retained.getIdempotencyKey());
        assertEquals(original.getPaymentLinkId(), retained.getPaymentLinkId()); assertEquals(original.getCheckoutUrl(), retained.getCheckoutUrl());
        assertEquals(original.getQrPayload(), retained.getQrPayload()); assertApplied("CANCELLED");
        verify(client, never()).create(any()); verify(client, never()).query(any());
    }

    @Test
    void realFix002CreateFlowIsBlockedWhileTransitionProviderVerificationRuns() throws Exception {
        String intent = attempts.findById(attemptId).orElseThrow().getIdempotencyKey();
        withPausedQuery(() -> {
            assertError("PAYMENT_TRANSITION_CONFLICT", () -> links().create(orderId, userId, intent));
            assertInventory(9, 1, 1);
        }, zero("CANCELLED"), null);
        assertApplied("CANCELLED"); verify(client, never()).create(any()); verify(client, never()).query(any());
    }

    private PaymentLinkService links() { return context.getBean(PaymentLinkService.class); }
    private PayOSPaymentClient.Result createResult() {
        return new PayOSPaymentClient.Result(code, new BigDecimal("100000"), link, "https://pay.payos.vn/web/" + link, "fixture-QR");
    }
    private void removeFixtureAttempt() { tx.executeWithoutResult(s -> attempts.deleteById(attemptId)); }
    private void selectCreatedAttempt() { attemptId = attempts.findByOrderId(orderId).orElseThrow().getId(); }


    private final class PausedLink implements AutoCloseable {
        private final CountDownLatch entered = new CountDownLatch(1);
        private final CountDownLatch release = new CountDownLatch(1);
        private final ExecutorService pool = Executors.newSingleThreadExecutor();
        private final Future<PaymentLinkService.Outcome> future;

        private PausedLink(boolean recovery, String intent) {
            org.mockito.stubbing.Answer<PayOSPaymentClient.Result> answer = invocation -> {
                assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
                entered.countDown(); assertTrue(release.await(10, TimeUnit.SECONDS));
                return createResult();
            };
            if (recovery) doAnswer(answer).when(client).query(code);
            else doAnswer(answer).when(client).create(any());
            future = pool.submit(() -> links().create(orderId, userId, intent));
        }
        private void awaitProvider() throws InterruptedException { assertTrue(entered.await(10, TimeUnit.SECONDS)); }
        private PaymentLinkService.Outcome complete() throws Exception {
            release.countDown(); return future.get(10, TimeUnit.SECONDS);
        }
        private void reject(String expected) {
            release.countDown();
            var failure = assertThrows(ExecutionException.class, () -> future.get(10, TimeUnit.SECONDS));
            var cause = assertInstanceOf(PaymentLinkException.class, failure.getCause());
            assertEquals(409, cause.getStatus()); assertEquals(expected, cause.getCode());
        }
        public void close() throws Exception {
            release.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    private void safeProvider() {
        when(client.queryPayment(code)).thenReturn(zero("PENDING"), zero("CANCELLED"));
        when(client.cancelPayment(code)).thenReturn(zero("CANCELLED"));
    }

    private PayOSPaymentClient.Query zero(String status) {
        return new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link, status, BigDecimal.ZERO, new BigDecimal("100000"), List.of());
    }

    private PayOSPaymentClient.Query paid(String reference, long amount) {
        return new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link, "PAID", BigDecimal.valueOf(amount),
                new BigDecimal("100000").subtract(BigDecimal.valueOf(amount)), List.of(transaction(reference, amount)));
    }

    private PayOSPaymentClient.Transaction transaction(String reference, long amount) {
        return new PayOSPaymentClient.Transaction(reference, BigDecimal.valueOf(amount), time);
    }

    private ObjectNode body(String method, long version) { return json.createObjectNode().put("targetPaymentMethod", method).put("expectedStateVersion", version); }
    private PaymentTransitionStore.Outcome submit() { return transitions.submit(orderId, userId, key, body("COD", 0)); }
    private Order order() { return orders.findById(orderId).orElseThrow(); }
    private PaymentMethodTransition operation() { return operations.findByOrderId(orderId).orElseThrow(); }
    private List<PaymentEvent> receipts() { return events.findByPaymentAttemptId(attemptId); }
    private void assertNoOperation() { assertTrue(operations.findByOrderId(orderId).isEmpty()); }
    private void setAttempt(PaymentAttempt.Status state) { tx.executeWithoutResult(s -> attempts.findById(attemptId).orElseThrow().setStatus(state)); }
    private void expireLease() { tx.executeWithoutResult(s -> operation().setLeaseUntil(LocalDateTime.now().minusSeconds(1))); }

    private void assertError(String expected, org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(PaymentLinkException.class, action); assertEquals(409, error.getStatus()); assertEquals(expected, error.getCode());
    }

    private void assertApplied(String retired) {
        assertEquals(orderId, order().getId()); assertEquals("COD", order().getPaymentMethod());
        assertEquals(OrderStatus.PENDING, order().getStatus()); assertNull(order().getExpiresAt());
        assertEquals(code, order().getPayosOrderCode()); assertEquals(attemptId, attempts.findById(attemptId).orElseThrow().getId());
        assertEquals(PaymentAttempt.Status.valueOf(retired), attempts.findById(attemptId).orElseThrow().getStatus());
        assertEquals(PaymentMethodTransition.Status.APPLIED, operation().getStatus()); assertInventory(9, 1, 1);
    }

    private void assertLate() {
        var attempt = attempts.findById(attemptId).orElseThrow();
        assertEquals(PaymentAttempt.Status.NEEDS_REVIEW, attempt.getStatus()); assertEquals("LATE_PAYMENT_AFTER_METHOD_CHANGE", attempt.getReviewReason());
        assertEquals("COD", order().getPaymentMethod()); assertEquals(PaymentMethodTransition.Status.APPLIED, operation().getStatus());
    }

    private void assertInventory(int stock, int reserved, int used) {
        var product = context.getBean(ProductRepository.class).findById(productId).orElseThrow();
        assertEquals(stock, product.getStock()); assertEquals(reserved, product.getReservedStock());
        assertEquals(used, context.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }

    private ObjectNode payload(String reference) {
        var payload = json.createObjectNode().put("code", "00").put("desc", "Thành công").put("success", true);
        var data = json.createObjectNode().put("amount", 100000).put("orderCode", code).put("reference", reference);
        data.put("paymentLinkId", link).put("currency", "VND").put("transactionDateTime", time).put("code", "00").put("description", "Kiểm thử").put("accountNumber", "test-only").put("desc", "Thành công");
        payload.set("data", data); var signatures = context.getBean(PayOSService.class);
        payload.put("signature", signatures.hmacSha256(signatures.canonicalData(data), KEY)); return payload;
    }

    private CustomUserDetails principal(Long id, Role role) { return new CustomUserDetails(User.builder().id(id).username("test").role(role).build()); }

    @Configuration @EnableWebMvc @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.sports.repository")
    @Import({SecurityConfig.class, CheckoutController.class, CheckoutExceptionAdvice.class, GlobalExceptionHandler.class,
            PayOSService.class, PaymentSettlementService.class, PaymentWebhookService.class, PaymentTransitionGuard.class,
            PaymentTransitionPolicy.class, PaymentTransitionStore.class, PaymentTransitionService.class, OrderStatusService.class,
            PaymentAttemptStore.class, PaymentLinkService.class})
    static class Config {
        @Bean static PropertySourcesPlaceholderConfigurer properties() {
            var config = new PropertySourcesPlaceholderConfigurer(); var values = new Properties();
            values.setProperty("payos.checksum-key", KEY); values.setProperty("payos.client-id", "fix057-test-only");
            values.setProperty("payos.api-key", "fix057-test-only"); values.setProperty("payos.return-url", "https://shop.test/return");
            values.setProperty("payos.cancel-url", "https://shop.test/cancel"); config.setProperties(values); return config;
        }
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:mysql://127.0.0.1:3306/" + SCHEMA,
                    System.getProperty("fix057.mysql.user", "root"), System.getProperty("fix057.mysql.password", ""));
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean(); factory.setDataSource(source);
            factory.setPackagesToScan("com.sports.entity"); factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create", "hibernate.dialect", "org.hibernate.dialect.MariaDBDialect")); return factory;
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean PayOSPaymentClient client() { return mock(PayOSPaymentClient.class); }
        @Bean ObjectMapper json() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() { return new JwtAuthenticationFilter(mock(JwtTokenProvider.class), mock(UserDetailsServiceImpl.class)); }
        @Bean PaymentLedgerService ledger(PaymentEventRepository events, PaymentEventConflictRepository conflicts) { return new PaymentLedgerService(events, conflicts); }
        @Bean VoucherService vouchers(VoucherRepository vouchers) { return new VoucherService(vouchers, new MockEnvironment()); }
        @Bean OrderService orderService(OrderRepository orders, ProductRepository products, UserRepository users,
                PayOSService payos, VoucherService vouchers, EntityManager em, PaymentTransitionGuard guard) {
            return spy(new OrderService(orders, products, users, payos, vouchers, em, guard));
        }
    }
}
