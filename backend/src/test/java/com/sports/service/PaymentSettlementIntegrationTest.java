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
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.context.annotation.*;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfSystemProperty(named = "fix003.mysql", matches = "true")
class PaymentSettlementIntegrationTest {
    private static final String SCHEMA = "fix003_test_" + UUID.randomUUID().toString().replace("-", "");
    private static AnnotationConfigWebApplicationContext context;
    private final ObjectMapper json = new ObjectMapper();
    private TransactionTemplate tx;
    private PaymentAttemptRepository attempts;
    private PaymentEventRepository events;
    private OrderRepository orders;
    private PaymentWebhookService webhooks;
    private PaymentReconciliationService reconcile;
    private PayOSPaymentClient client;
    private PaymentLedgerService ledger;
    private OrderService orderService;
    private MockMvc mvc;
    private Long attemptId, orderId, userId, productId;
    private Long code;
    private String link, voucher, time;
    private static final String KEY = "fix003-fixture-only-key";

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
        if (!SCHEMA.matches("fix003_test_[0-9a-f]{32}")) throw new IllegalStateException();
        try (var c = connect(); var s = c.createStatement()) { s.execute("DROP DATABASE `" + SCHEMA + "`"); }
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection("jdbc:mysql://127.0.0.1:3306/",
                System.getProperty("fix003.mysql.user", "root"), System.getProperty("fix003.mysql.password", ""));
    }

    @BeforeEach
    void fixture() {
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        attempts = context.getBean(PaymentAttemptRepository.class);
        events = context.getBean(PaymentEventRepository.class);
        orders = context.getBean(OrderRepository.class);
        webhooks = context.getBean(PaymentWebhookService.class);
        reconcile = context.getBean(PaymentReconciliationService.class);
        client = context.getBean(PayOSPaymentClient.class);
        ledger = context.getBean(PaymentLedgerService.class);
        orderService = context.getBean(OrderService.class);
        reset(client, ledger, orderService);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        time = LocalDateTime.now().minusSeconds(5).withNano(0).toString();
        tx.executeWithoutResult(s -> createFixture());
    }

    private void createFixture() {
        String name = UUID.randomUUID().toString();
        var customer = context.getBean(UserRepository.class).save(User.builder().username(name)
                .email(name + "@test.invalid").password("test-only").role(Role.ROLE_USER).build());
        userId = customer.getId();
        var product = context.getBean(ProductRepository.class).save(Product.builder().name("Vợt kiểm thử")
                .brand("Test").price(new BigDecimal("100000")).stock(9).reservedStock(1).build());
        productId = product.getId();
        voucher = UUID.randomUUID().toString();
        context.getBean(VoucherRepository.class).save(Voucher.builder().code(voucher).discountType("FIXED")
                .discountValue(BigDecimal.TEN).usedCount(1).maxUses(10).build());
        var order = Order.builder().user(customer).totalAmount(new BigDecimal("100000"))
                .customerName("Khách kiểm thử").voucherCode(voucher).expiresAt(LocalDateTime.now().plusMinutes(15)).build();
        order.getItems().add(OrderItem.builder().order(order).product(product).quantity(1).price(product.getPrice()).build());
        orders.saveAndFlush(order);
        orderId = order.getId();
        code = 1000000000L + orderId;
        link = "link-" + orderId;
        order.setPayosOrderCode(code);
        createAttempt(order);
    }

    private void createAttempt(Order order) {
        var attempt = new PaymentAttempt();
        attempt.setOrder(order);
        attempt.setOrderCode(code);
        attempt.setPaymentLinkId(link);
        attempt.setIdempotencyKey(UUID.randomUUID().toString());
        attempt.setAmount(new BigDecimal("100000"));
        attempt.setExpiresAt(order.getExpiresAt());
        attempt.setStatus(PaymentAttempt.Status.PENDING);
        attemptId = attempts.saveAndFlush(attempt).getId();
    }

    @Test
    void validAndSequentialDuplicateCommitOneSettlementAndTrustedTime() {
        var payload = payload("REF");
        webhooks.accept(payload);
        webhooks.accept(payload);
        assertPaid(1);
        var attempt = attempts.findById(attemptId).orElseThrow();
        assertEquals(LocalDateTime.parse(time), attempt.getPaidAt());
        assertEquals("REF", attempt.getReference());
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"PAID", "SHIPPING", "COMPLETED"})
    void settledPaymentKeepsPaidAfterSignedNonSuccessInFulfillmentState(OrderStatus state) throws Exception {
        var original = settleForState(state);
        var incoming = nonSuccessPayload("NON-SUCCESS");

        acceptedWebhook(incoming);
        acceptedWebhook(incoming);

        assertSettlementPreserved(original, state);
        assertEquals(2, events.findByPaymentAttemptId(attemptId).size());
        var event = eventForReference("NON-SUCCESS");
        assertEquals("NON_SETTLING", event.getProcessingResult());
        assertEquals("NON_SUCCESS_PROVIDER_EVENT", event.getReviewReason());
        assertFalse(event.isReceivedPayment());
        assertTrue(event.getReviewHistory().contains("NON_SUCCESS_PROVIDER_EVENT"));
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void pendingNonSuccessStillNeedsReviewWithoutSettling() throws Exception {
        acceptedWebhook(nonSuccessPayload("PENDING-NON-SUCCESS"));

        assertReview("NON_SUCCESS_PROVIDER_EVENT");
        assertNull(attempts.findById(attemptId).orElseThrow().getPaidAt());
        assertEquals("NEEDS_REVIEW", eventForReference("PENDING-NON-SUCCESS").getProcessingResult());
        assertPendingInventory();
        verify(orderService, never()).handlePaymentSuccess(any(), any());
    }

    @Test
    void pendingWrongAmountStillNeedsReviewWithoutSettling() throws Exception {
        var incoming = payload("WRONG-AMOUNT-CONTROL");
        data(incoming).put("amount", 50000);
        sign(incoming);

        acceptedWebhook(incoming);

        assertReview("AMOUNT_MISMATCH");
        assertPendingInventory();
        verify(orderService, never()).handlePaymentSuccess(any(), any());
    }

    @Test
    void settledSameKeyConflictRetainsExplicitContractReviewAndOriginalFacts() throws Exception {
        var original = settleForState(OrderStatus.PAID);
        long conflicts = context.getBean(PaymentEventConflictRepository.class).count();
        var incoming = nonSuccessPayload("ORIGINAL");
        data(incoming).put("amount", 50000);
        sign(incoming);

        acceptedWebhook(incoming);
        acceptedWebhook(incoming);

        assertReview("EVENT_IDENTITY_CONFLICT");
        assertEquals(original.getPaidAt(), attempts.findById(attemptId).orElseThrow().getPaidAt());
        assertEquals(OrderStatus.PAID, orders.findById(orderId).orElseThrow().getStatus());
        assertEquals(1, events.findByPaymentAttemptId(attemptId).size());
        assertEquals(0, new BigDecimal("100000").compareTo(eventForReference("ORIGINAL").getAmount()));
        assertEquals(conflicts + 1, context.getBean(PaymentEventConflictRepository.class).count());
        assertInventory(9, 0, 1);
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void settledNonSuccessCommitFailureRollsBackAuditAndRetriesSafely() throws Exception {
        var original = settleForState(OrderStatus.PAID);
        var incoming = nonSuccessPayload("NON-SUCCESS-ROLLBACK");
        failNextLedgerCommit();

        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(incoming.toString()))
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.error").value(1));

        assertEquals(1, events.findByPaymentAttemptId(attemptId).size());
        assertSettlementPreserved(original, OrderStatus.PAID);
        acceptedWebhook(incoming);
        assertEquals(2, events.findByPaymentAttemptId(attemptId).size());
        assertEquals("NON_SETTLING", eventForReference("NON-SUCCESS-ROLLBACK").getProcessingResult());
        assertSettlementPreserved(original, OrderStatus.PAID);
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void settledMultipleReferencesRemainNullAfterNonSuccessAudit() throws Exception {
        var first = payload("FIRST");
        data(first).put("amount", 40000);
        sign(first);
        webhooks.accept(first);
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO,
                List.of(transaction("FIRST", 40000), transaction("SECOND", 60000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Đủ hai giao dịch").status());
        var original = attempts.findById(attemptId).orElseThrow();
        assertNull(original.getReference());

        acceptedWebhook(nonSuccessPayload("MULTI-NON-SUCCESS"));

        assertSettlementPreserved(original, OrderStatus.PAID);
        assertEquals(3, events.findByPaymentAttemptId(attemptId).size());
        assertEquals("NON_SETTLING", eventForReference("MULTI-NON-SUCCESS").getProcessingResult());
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void settledNonSuccessAndReconciliationRacePreservesOneSettlement() throws Exception {
        var original = settleForState(OrderStatus.PAID);
        when(client.queryPayment(code)).thenReturn(paidQuery("ORIGINAL", 100000));
        var incoming = nonSuccessPayload("RACE-NON-SUCCESS");

        race(() -> webhooks.accept(incoming), () -> {
            var result = reconcile(UUID.randomUUID().toString(), "Đối soát giao dịch đã thanh toán");
            assertEquals(200, result.status());
            assertEquals(PaymentAttempt.Status.PAID, result.attempt().status());
        });

        assertSettlementPreserved(original, OrderStatus.PAID);
        assertEquals(2, events.findByPaymentAttemptId(attemptId).size());
        assertEquals("NON_SETTLING", eventForReference("RACE-NON-SUCCESS").getProcessingResult());
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void concurrentDuplicateWebhooksCommitExactlyOneEventAndStockTransition() throws Exception {
        race(() -> webhooks.accept(payload("REF")), () -> webhooks.accept(payload("REF")));
        assertPaid(1);
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void concurrentUnmatchedEventsAreDeduplicatedByDatabaseConstraint() throws Exception {
        long count = events.count();
        var payload = payload("unmatched-race");
        data(payload).put("paymentLinkId", "unmatched-race-link").put("orderCode", 987654321L); sign(payload);
        race(() -> webhooks.accept(payload), () -> webhooks.accept(payload));
        assertEquals(count + 1, events.count());
        assertPendingInventory();
    }

    @Test
    void unmatchedAndSampleLikeEventsRemainDurableWithoutFakeAttemptOrOrder() {
        long oldAttempts = attempts.count(), oldOrders = orders.count(), oldEvents = events.count();
        var payload = payload("sample-like");
        data(payload).put("orderCode", 987654321).put("paymentLinkId", "unmatched-link");
        sign(payload);
        webhooks.accept(payload);
        webhooks.accept(payload);
        assertEquals(oldAttempts, attempts.count());
        assertEquals(oldOrders, orders.count());
        assertEquals(oldEvents + 1, events.count());
        tx.executeWithoutResult(s -> {
            var event = events.findByProviderAndPaymentLinkIdAndReference("PAYOS", "unmatched-link", "sample-like").orElseThrow();
            assertNull(event.getPaymentAttempt());
            assertNull(event.getOrder());
            assertEquals("UNMATCHED", event.getProcessingResult());
        });
        assertPendingInventory();
    }

    @Test
    void wrongAmountCurrencyIdentityAndSignedNonSuccessNeverSettle() {
        var payload = payload("underpaid");
        data(payload).put("amount", 50000); sign(payload); webhooks.accept(payload);
        assertReview("AMOUNT_MISMATCH");
        payload = payload("non-success"); data(payload).put("code", "99"); sign(payload); webhooks.accept(payload);
        assertReview("NON_SUCCESS_PROVIDER_EVENT");
        payload = payload("wrong-currency"); data(payload).put("currency", "USD"); sign(payload); webhooks.accept(payload);
        assertReview("CURRENCY_MISMATCH");
        payload = payload("wrong-code"); data(payload).put("orderCode", code + 1000); sign(payload); webhooks.accept(payload);
        assertReview("CURRENCY_MISMATCH");
        assertPendingInventory();
        verify(orderService, never()).handlePaymentSuccess(any(), any());
    }

    @Test
    void eventConflictPreservesOriginalFactsAndDeduplicatesConflictAudit() {
        long oldConflicts = context.getBean(PaymentEventConflictRepository.class).count();
        var payload = payload("conflict");
        data(payload).put("amount", 50000); sign(payload); webhooks.accept(payload);
        data(payload).put("amount", 100000); sign(payload); webhooks.accept(payload); webhooks.accept(payload);
        assertReview("EVENT_IDENTITY_CONFLICT");
        var saved = events.findByPaymentAttemptId(attemptId);
        assertEquals(1, saved.size());
        assertEquals(0, new BigDecimal("50000").compareTo(saved.get(0).getAmount()));
        assertEquals(oldConflicts + 1, context.getBean(PaymentEventConflictRepository.class).count());
        assertPendingInventory();
    }

    @Test
    void keyUsesExactCaseTrailingSpaceAndLinkInsteadOfGlobalReference() {
        long count = events.count();
        for (String reference : new String[]{"REF", "ref", "REF "}) {
            var payload = payload(reference); data(payload).put("amount", 1000); sign(payload); webhooks.accept(payload);
        }
        var payload = payload("REF"); data(payload).put("paymentLinkId", "other-link").put("orderCode", 900000L);
        sign(payload); webhooks.accept(payload);
        assertEquals(count + 4, events.count());
        assertEquals(3, events.findByPaymentAttemptId(attemptId).size());
        assertPendingInventory();
    }

    @Test
    void cancelledOrderReceivingPaymentNeverRevivesOrConsumesReturnedStockVoucher() {
        orderService.cancelOrder(orderId, userId, false);
        webhooks.accept(payload("late-cancel"));
        assertReview("LATE_PAYMENT_CANCELLED_ORDER");
        assertEquals(OrderStatus.CANCELLED, orders.findById(orderId).orElseThrow().getStatus());
        assertInventory(10, 0, 0);
    }

    @Test
    void expiredOrderReceivingPaymentKeepsOrderAndReservationsUnchanged() {
        tx.executeWithoutResult(s -> {
            orders.findById(orderId).orElseThrow().setExpiresAt(LocalDateTime.now().minusMinutes(1));
            attempts.findById(attemptId).orElseThrow().setExpiresAt(LocalDateTime.now().minusMinutes(1));
        });
        webhooks.accept(payload("late-expired"));
        assertReview("LATE_PAYMENT_EXPIRED");
        assertPendingInventory();
    }

    @Test
    void beforeCommitFailureReturns500RollsBackAllChangesAndRetrySettlesOnce() throws Exception {
        long count = events.count();
        doAnswer(invocation -> {
            Object receipt = invocation.callRealMethod();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void beforeCommit(boolean readOnly) { throw new IllegalStateException("test-only commit failure"); }
            });
            return receipt;
        }).doCallRealMethod().when(ledger).record(any(), any());
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(payload("rollback").toString()))
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.error").value(1));
        assertEquals(count, events.count());
        assertEquals(PaymentAttempt.Status.PENDING, attempts.findById(attemptId).orElseThrow().getStatus());
        assertPendingInventory();
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(payload("rollback").toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.error").value(0));
        assertPaid(1);
    }

    @Test
    void reconciliationCommitFailureReturnsApiErrorAndSameKeyCanRetry() throws Exception {
        String key = UUID.randomUUID().toString();
        when(client.queryPayment(code)).thenReturn(paidQuery("RECONCILE-ROLLBACK", 100000));
        doAnswer(invocation -> {
            Object receipt = invocation.callRealMethod();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void beforeCommit(boolean readOnly) { throw new IllegalStateException("test-only commit failure"); }
            });
            return receipt;
        }).doCallRealMethod().when(ledger).record(any(), any());
        String path = "/api/admin/payments/" + attemptId + "/reconcile";
        mvc.perform(post(path).with(user(principal(Role.ROLE_ADMIN))).header("Idempotency-Key", key)
                .contentType("application/json").content("{\"reason\":\"Retry sau rollback\"}"))
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.code").value("PAYMENT_PROCESSING_FAILED"));
        assertTrue(events.findByPaymentAttemptId(attemptId).isEmpty()); assertPendingInventory();
        assertFalse(context.getBean(PaymentReconciliationRepository.class).findByPaymentAttemptIdAndIdempotencyKey(attemptId, key).orElseThrow().isCompleted());
        assertEquals(200, reconcile(key, "Retry sau rollback").status()); assertPaid(1);
    }

    @Test
    void reconcilePaidIsDurableIdempotentAndHttpRunsOutsideTransaction() {
        String key = UUID.randomUUID().toString();
        when(client.queryPayment(code)).thenAnswer(i -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            return paidQuery("REF", 100000);
        });
        assertEquals(200, reconcile(key, "Kiểm tra giao dịch").status());
        var originalTime = attempts.findById(attemptId).orElseThrow().getPaidAt();
        assertEquals(200, reconcile(key, "Kiểm tra giao dịch").status());
        assertEquals(originalTime, attempts.findById(attemptId).orElseThrow().getPaidAt());
        assertEquals(409, assertThrows(PaymentLinkException.class, () -> reconcile(key, "Lý do khác")).getStatus());
        verify(client, times(1)).queryPayment(code);
        var request = context.getBean(PaymentReconciliationRepository.class).findByPaymentAttemptIdAndIdempotencyKey(attemptId, key).orElseThrow();
        assertTrue(request.isCompleted());
        assertTrue(request.getEvidenceHistory().contains("REF"));
        assertPaid(1);
    }

    @Test
    void unresolved202AndTimeoutRemainRetryableOnSameKey() {
        String key = UUID.randomUUID().toString();
        when(client.queryPayment(code)).thenThrow(new PaymentLinkException(504, "PAYOS_UNAVAILABLE", "Timeout"))
                .thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link, "PENDING",
                        BigDecimal.ZERO, new BigDecimal("100000"), List.of()))
                .thenReturn(paidQuery("REF", 100000));
        assertEquals(504, assertThrows(PaymentLinkException.class, () -> reconcile(key, "Kiểm tra")).getStatus());
        assertEquals(202, reconcile(key, "Kiểm tra").status());
        assertPendingInventory();
        assertEquals(200, reconcile(key, "Kiểm tra").status());
        verify(client, times(3)).queryPayment(code);
        assertPaid(1);
    }

    @Test
    void paidQueryWithoutActualTransactionsIs202AndDoesNotForcePaid() {
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of()));
        assertEquals(202, reconcile(UUID.randomUUID().toString(), "Thiếu bằng chứng").status());
        assertPendingInventory();
        assertEquals(PaymentAttempt.Status.PENDING, attempts.findById(attemptId).orElseThrow().getStatus());
    }

    @Test
    void multiTransactionQueryResolvesPartialMismatchAndLeavesReferenceNull() {
        var payload = payload("FIRST"); data(payload).put("amount", 40000); sign(payload); webhooks.accept(payload);
        assertReview("AMOUNT_MISMATCH");
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of(transaction("FIRST", 40000), transaction("SECOND", 60000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Đủ hai giao dịch").status());
        assertPaid(2);
        assertNull(attempts.findById(attemptId).orElseThrow().getReference());
        assertTrue(events.findByPaymentAttemptId(attemptId).stream().allMatch(e -> "PAID".equals(e.getProcessingResult())));
        assertTrue(events.findByPaymentAttemptId(attemptId).stream().anyMatch(e -> e.getReviewHistory() != null && e.getReviewHistory().contains("AMOUNT_MISMATCH")));
    }

    @Test
    void hardIdentityBlockSurvivesLaterPartialWebhookAndVerifiedQuery() {
        var payload = payload("identity"); data(payload).put("orderCode", code + 10); sign(payload); webhooks.accept(payload);
        payload = payload("partial"); data(payload).put("amount", 40000); sign(payload); webhooks.accept(payload);
        assertReview("IDENTITY_MISMATCH");
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of(transaction("partial", 40000), transaction("rest", 60000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Không bỏ qua cảnh báo").status());
        assertReview("IDENTITY_MISMATCH");
        assertPendingInventory();
    }

    @Test
    void verifiedQueryCanResolvePriorNonSuccessWithoutErasingReviewHistory() {
        var payload = payload("resolved"); payload.put("success", false); webhooks.accept(payload);
        assertReview("NON_SUCCESS_PROVIDER_EVENT");
        when(client.queryPayment(code)).thenReturn(paidQuery("resolved", 100000));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Provider xác nhận tiền").status());
        assertPaid(1);
        assertTrue(events.findByPaymentAttemptId(attemptId).get(0).getReviewHistory().contains("NON_SUCCESS_PROVIDER_EVENT"));
    }

    @Test
    void invalidTransactionTimeAndQueryIdentityMismatchNeverFabricatePaidAt() {
        var payload = payload("invalid-time"); data(payload).put("transactionDateTime", "not-a-time"); sign(payload); webhooks.accept(payload);
        assertReview("INVALID_TRANSACTION_TIME");
        assertNull(attempts.findById(attemptId).orElseThrow().getPaidAt());
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), "wrong-link",
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of(transaction("query", 100000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Sai định danh query").status());
        assertReview("INVALID_TRANSACTION_TIME");
        assertPendingInventory();
    }

    @Test
    void additionalMoneyAfterPaidIsRecordedForReviewWithoutRepeatedInventoryMutation() {
        webhooks.accept(payload("original"));
        var paidAt = attempts.findById(attemptId).orElseThrow().getPaidAt();
        webhooks.accept(payload("extra"));
        var attempt = attempts.findById(attemptId).orElseThrow();
        assertEquals(PaymentAttempt.Status.PAID, attempt.getStatus());
        assertEquals("original", attempt.getReference());
        assertNull(attempt.getReviewReason());
        assertEquals("NEEDS_REVIEW", eventForReference("extra").getProcessingResult());
        assertEquals("EXTRA_PAYMENT", eventForReference("extra").getReviewReason());
        assertEquals(paidAt, attempts.findById(attemptId).orElseThrow().getPaidAt());
        assertEquals(OrderStatus.PAID, orders.findById(orderId).orElseThrow().getStatus());
        assertEquals(2, events.findByPaymentAttemptId(attemptId).size());
        assertInventory(9, 0, 1);
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void queryOverpaymentAndDuplicateReferenceAreReviewNotSubsetSettlement() {
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("110000"), BigDecimal.ZERO, List.of(transaction("overpaid", 110000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Thừa tiền").status());
        assertReview("AMOUNT_MISMATCH");
        when(client.queryPayment(code)).thenReturn(new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link,
                "PAID", new BigDecimal("100000"), BigDecimal.ZERO, List.of(transaction("duplicate", 50000), transaction("duplicate", 50000))));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Trùng định danh").status());
        assertReview("TRANSACTION_EVIDENCE_MISMATCH");
        assertPendingInventory();
    }

    @Test
    void reconcileLatePaymentRecordsEvidenceButNeverRevivesOrder() {
        orderService.cancelOrder(orderId, userId, false);
        when(client.queryPayment(code)).thenReturn(paidQuery("late-query", 100000));
        assertEquals(200, reconcile(UUID.randomUUID().toString(), "Tiền đến muộn").status());
        assertReview("LATE_PAYMENT_CANCELLED_ORDER");
        assertInventory(10, 0, 0);
        assertEquals(OrderStatus.CANCELLED, orders.findById(orderId).orElseThrow().getStatus());
    }

    @Test
    void concurrentWebhookAndReconcileUseOneSettlementAndOneEvent() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(client.queryPayment(code)).thenAnswer(i -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            entered.countDown(); assertTrue(release.await(10, TimeUnit.SECONDS));
            return paidQuery("RACE", 100000);
        });
        var pool = Executors.newFixedThreadPool(2);
        try {
            var query = pool.submit(() -> reconcile(UUID.randomUUID().toString(), "Race"));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var webhook = pool.submit(() -> { release.countDown(); webhooks.accept(payload("RACE")); });
            assertEquals(200, query.get(20, TimeUnit.SECONDS).status()); webhook.get(20, TimeUnit.SECONDS);
        } finally { release.countDown(); pool.shutdownNow(); }
        assertPaid(1);
        verify(orderService, times(1)).handlePaymentSuccess(code, new BigDecimal("100000"));
    }

    @Test
    void cancellationDuringProviderQueryIsRecheckedUnderDatabaseLock() throws Exception {
        queryWithConcurrentChange(() -> orderService.cancelOrder(orderId, userId, false));
        assertReview("LATE_PAYMENT_CANCELLED_ORDER");
        assertEquals(OrderStatus.CANCELLED, orders.findById(orderId).orElseThrow().getStatus());
        assertInventory(10, 0, 0);
    }

    @Test
    void expirationDuringProviderQueryIsRecheckedUnderDatabaseLock() throws Exception {
        queryWithConcurrentChange(() -> tx.executeWithoutResult(s -> {
            orders.findById(orderId).orElseThrow().setExpiresAt(LocalDateTime.now().minusMinutes(1));
            attempts.findById(attemptId).orElseThrow().setExpiresAt(LocalDateTime.now().minusMinutes(1));
        }));
        assertReview("LATE_PAYMENT_EXPIRED");
        assertPendingInventory();
    }

    private void queryWithConcurrentChange(Runnable change) throws Exception {
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        when(client.queryPayment(code)).thenAnswer(i -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            entered.countDown(); assertTrue(release.await(10, TimeUnit.SECONDS)); return paidQuery("QUERY-RACE", 100000);
        });
        var pool = Executors.newSingleThreadExecutor();
        try {
            var result = pool.submit(() -> reconcile(UUID.randomUUID().toString(), "Kiểm tra trạng thái mới"));
            assertTrue(entered.await(10, TimeUnit.SECONDS)); change.run(); release.countDown();
            assertEquals(200, result.get(20, TimeUnit.SECONDS).status());
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test
    void realSecurityRejectsAnonymousCustomerAndProductionMockRoute() throws Exception {
        mvc.perform(get("/api/admin/payments")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_USER)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/payments/{id}/reconcile", attemptId).with(user(principal(Role.ROLE_USER)))
                .contentType("application/json").content("{\"reason\":\"Test\"}")) .andExpect(status().isForbidden());
        mvc.perform(post("/api/payment/mock-webhook-trigger").with(user(principal(Role.ROLE_ADMIN)))
                .param("orderCode", code.toString()).param("amount", "100000")).andExpect(status().isNotFound());
        assertPendingInventory();
    }

    @Test
    void adminControllerValidatesIntentAndReturnsActualAttemptContract() throws Exception {
        String path = "/api/admin/payments/" + attemptId + "/reconcile";
        mvc.perform(post(path).with(user(principal(Role.ROLE_ADMIN))).contentType("application/json")
                .content("{\"reason\":\"Test\"}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IDEMPOTENCY_KEY"));
        for (String body : new String[]{"{", "{\"reason\":\" \"}", "{\"reason\":\"Test\",\"status\":\"PAID\"}"}) {
            mvc.perform(post(path).with(user(principal(Role.ROLE_ADMIN))).header("Idempotency-Key", UUID.randomUUID())
                    .contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(client);
        when(client.queryPayment(code)).thenReturn(paidQuery("ADMIN", 100000));
        mvc.perform(post(path).with(user(principal(Role.ROLE_ADMIN))).header("Idempotency-Key", UUID.randomUUID())
                .contentType("application/json").content("{\"reason\":\"Đối soát\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(attemptId))
                .andExpect(jsonPath("$.orderId").value(orderId)).andExpect(jsonPath("$.status").value("PAID"));
        assertPaid(1);
    }

    @Test
    void webhookControllerReturnsContract401400AndDurable200WithoutJwt() throws Exception {
        var invalid = payload("invalid"); invalid.put("signature", "0".repeat(64));
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(invalid.toString()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value(-1));
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value(1));
        var underpaid = payload("underpaid"); data(underpaid).put("amount", 1000); sign(underpaid);
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(underpaid.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.error").value(0));
        assertReview("AMOUNT_MISMATCH");
    }

    @Test
    void adminListUsesRealAttemptsSupportsPageFilterAndNeverSynthesizesCod() throws Exception {
        tx.executeWithoutResult(s -> orders.save(Order.builder().user(context.getBean(UserRepository.class).findById(userId).orElseThrow())
                .paymentMethod("COD").totalAmount(BigDecimal.TEN).build()));
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_ADMIN))).param("query", code.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(attemptId)).andExpect(jsonPath("$[0].customerName").value("Khách kiểm thử"));
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_ADMIN))).param("page", "0")
                .param("size", "1").param("query", code.toString()).param("status", "PENDING"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.pageNo").value(0)).andExpect(jsonPath("$.pageSize").value(1));
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_ADMIN))).param("size", "101"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_ADMIN))).param("status", "invalid"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/payments").with(user(principal(Role.ROLE_ADMIN))).param("page", "invalid"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PAYMENT_REQUEST"));
    }

    private void race(Runnable first, Runnable second) throws Exception {
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> { await(start); first.run(); });
            var b = pool.submit(() -> { await(start); second.run(); });
            start.countDown(); a.get(20, TimeUnit.SECONDS); b.get(20, TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
    }

    private void await(CountDownLatch latch) {
        try { assertTrue(latch.await(10, TimeUnit.SECONDS)); }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new AssertionError(ex); }
    }

    private PaymentSettlementService.Outcome reconcile(String key, String reason) {
        return reconcile.reconcile(attemptId, userId, key, json.createObjectNode().put("reason", reason));
    }

    private PaymentAttempt settleForState(OrderStatus state) {
        webhooks.accept(payload("ORIGINAL"));
        assertPaid(1);
        tx.executeWithoutResult(s -> orders.findById(orderId).orElseThrow().setStatus(state));
        return attempts.findById(attemptId).orElseThrow();
    }

    private ObjectNode nonSuccessPayload(String reference) {
        var incoming = payload(reference);
        data(incoming).put("code", "99");
        sign(incoming);
        return incoming;
    }

    private void acceptedWebhook(ObjectNode incoming) throws Exception {
        mvc.perform(post("/api/payment/payos-webhook").contentType("application/json").content(incoming.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.error").value(0))
                .andExpect(jsonPath("$.message").value("Đã tiếp nhận")).andExpect(jsonPath("$.data").doesNotExist());
    }

    private PaymentEvent eventForReference(String reference) {
        return events.findByPaymentAttemptId(attemptId).stream()
                .filter(e -> reference.equals(e.getReference())).findFirst().orElseThrow();
    }

    private void assertSettlementPreserved(PaymentAttempt original, OrderStatus state) {
        var current = attempts.findById(attemptId).orElseThrow();
        assertEquals(PaymentAttempt.Status.PAID, current.getStatus());
        assertEquals(original.getReference(), current.getReference());
        assertEquals(original.getPaidAt(), current.getPaidAt());
        assertEquals(original.getReviewReason(), current.getReviewReason());
        assertEquals(state, orders.findById(orderId).orElseThrow().getStatus());
        assertInventory(9, 0, 1);
    }

    private void failNextLedgerCommit() {
        doAnswer(invocation -> {
            Object receipt = invocation.callRealMethod();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void beforeCommit(boolean readOnly) {
                    throw new IllegalStateException("test-only commit failure");
                }
            });
            return receipt;
        }).doCallRealMethod().when(ledger).record(any(), any());
    }

    private PayOSPaymentClient.Transaction transaction(String reference, long amount) {
        return new PayOSPaymentClient.Transaction(reference, BigDecimal.valueOf(amount), time);
    }

    private PayOSPaymentClient.Query paidQuery(String reference, long amount) {
        return new PayOSPaymentClient.Query(code, new BigDecimal("100000"), link, "PAID",
                BigDecimal.valueOf(amount), BigDecimal.ZERO, List.of(transaction(reference, amount)));
    }

    private ObjectNode payload(String reference) {
        var payload = json.createObjectNode().put("code", "00").put("desc", "Thành công").put("success", true);
        var data = json.createObjectNode().put("amount", 100000).put("orderCode", code).put("reference", reference);
        data.put("paymentLinkId", link).put("currency", "VND").put("transactionDateTime", time);
        data.put("code", "00").put("description", "Kiểm thử").put("accountNumber", "test-only").put("desc", "Thành công");
        payload.set("data", data); sign(payload); return payload;
    }

    private ObjectNode data(ObjectNode payload) { return (ObjectNode) payload.get("data"); }

    private void sign(ObjectNode payload) {
        var signatures = context.getBean(PayOSService.class);
        payload.put("signature", signatures.hmacSha256(signatures.canonicalData(payload.get("data")), KEY));
    }

    private CustomUserDetails principal(Role role) {
        return new CustomUserDetails(User.builder().id(userId).username("test").role(role).build());
    }

    private void assertReview(String reason) {
        var attempt = attempts.findById(attemptId).orElseThrow();
        assertEquals(PaymentAttempt.Status.NEEDS_REVIEW, attempt.getStatus());
        assertEquals(reason, attempt.getReviewReason());
    }

    private void assertPaid(int count) {
        assertEquals(PaymentAttempt.Status.PAID, attempts.findById(attemptId).orElseThrow().getStatus());
        assertEquals(OrderStatus.PAID, orders.findById(orderId).orElseThrow().getStatus());
        assertEquals(count, events.findByPaymentAttemptId(attemptId).size());
        assertInventory(9, 0, 1);
    }

    private void assertPendingInventory() {
        assertEquals(OrderStatus.PENDING, orders.findById(orderId).orElseThrow().getStatus());
        assertInventory(9, 1, 1);
    }

    private void assertInventory(int stock, int reserved, int used) {
        var product = context.getBean(ProductRepository.class).findById(productId).orElseThrow();
        assertEquals(stock, product.getStock()); assertEquals(reserved, product.getReservedStock());
        assertEquals(used, context.getBean(VoucherRepository.class).findByCodeIgnoreCase(voucher).orElseThrow().getUsedCount());
    }

    @Configuration @EnableWebMvc @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.sports.repository")
    @Import({SecurityConfig.class, PaymentController.class, AdminPaymentController.class, GlobalExceptionHandler.class,
            PayOSService.class, PaymentSettlementService.class, PaymentWebhookService.class, PaymentReconciliationStore.class,
            PaymentReconciliationService.class, AdminPaymentService.class})
    static class Config {
        @Bean static PropertySourcesPlaceholderConfigurer properties() {
            var config = new PropertySourcesPlaceholderConfigurer();
            var values = new Properties(); values.setProperty("payos.checksum-key", KEY);
            values.setProperty("payos.client-id", "fix003-test-only"); values.setProperty("payos.api-key", "fix003-test-only");
            values.setProperty("payos.return-url", "https://shop.test/return"); values.setProperty("payos.cancel-url", "https://shop.test/cancel");
            config.setProperties(values); return config;
        }
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:mysql://127.0.0.1:3306/" + SCHEMA,
                    System.getProperty("fix003.mysql.user", "root"), System.getProperty("fix003.mysql.password", ""));
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean(); factory.setDataSource(source);
            factory.setPackagesToScan("com.sports.entity"); factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create", "hibernate.dialect", "org.hibernate.dialect.MariaDBDialect"));
            return factory;
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean PayOSPaymentClient client() { return mock(PayOSPaymentClient.class); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() {
            return new JwtAuthenticationFilter(mock(JwtTokenProvider.class), mock(UserDetailsServiceImpl.class));
        }
        @Bean PaymentLedgerService ledger(PaymentEventRepository events, PaymentEventConflictRepository conflicts) {
            return spy(new PaymentLedgerService(events, conflicts));
        }
        @Bean VoucherService vouchers(VoucherRepository vouchers) { return new VoucherService(vouchers, new MockEnvironment()); }
        @Bean OrderService orderService(OrderRepository orders, ProductRepository products, UserRepository users,
                PayOSService payos, VoucherService vouchers, EntityManager em) {
            return spy(new OrderService(orders, products, users, payos, vouchers, em));
        }
    }
}
