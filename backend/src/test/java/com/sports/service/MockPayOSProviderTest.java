package com.sports.service;

import com.fasterxml.jackson.databind.*;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.mockpayos.*;
import com.sports.repository.*;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MockPayOSProviderTest {
    private MockPayOSStateRepository states;
    private MockPayOSActionRepository actions;
    private OrderRepository orders;
    private PaymentAttemptRepository attempts;
    private MockPayOSStore store;
    private MockPayOSProvider provider;
    private MockPayOSProof proof;
    private MockPayOSState state;
    private com.sports.entity.Order order;
    private PaymentAttempt attempt;
    private PaymentAttemptResponse response;

    @BeforeEach void arrange() {
        states=mock(MockPayOSStateRepository.class); actions=mock(MockPayOSActionRepository.class);
        orders=mock(OrderRepository.class); attempts=mock(PaymentAttemptRepository.class);
        proof=new MockPayOSProof(new PayOSService(),new ObjectMapper(),"1".repeat(64));
        store=new MockPayOSStore(states,actions,orders,attempts,proof);
        ReflectionTestUtils.setField(store,"frontendOrigin","http://localhost:5173"); provider=new MockPayOSProvider(store);
        order=com.sports.entity.Order.builder().id(501L).user(User.builder().id(9L).build()).totalAmount(new BigDecimal("100000"))
                .payosOrderCode(1000000501L).expiresAt(LocalDateTime.now().plusMinutes(15)).build();
        attempt=new PaymentAttempt(); attempt.setId(88L); attempt.setOrder(order); attempt.setOrderCode(order.getPayosOrderCode());
        attempt.setAmount(order.getTotalAmount()); attempt.setExpiresAt(order.getExpiresAt()); attempt.setIdempotencyKey(UUID.randomUUID().toString());
        response=PaymentAttemptResponse.from(attempt);
        when(orders.findByIdForUpdate(501L)).thenReturn(Optional.of(order)); when(orders.findById(501L)).thenReturn(Optional.of(order));
        when(attempts.findById(88L)).thenReturn(Optional.of(attempt));
        when(states.lockCode(any())).thenAnswer(i->Optional.ofNullable(state));
        when(states.findByOrderCode(any())).thenAnswer(i->Optional.ofNullable(state));
        when(states.findByOrderId(any())).thenAnswer(i->Optional.ofNullable(state));
        when(states.saveAndFlush(any())).thenAnswer(i->{state=i.getArgument(0);state.setId(77L);return state;});
    }

    private String action(MockPayOSScenario scenario) {
        var action=new MockPayOSAction();action.setActionId(UUID.randomUUID().toString());action.setOrderId(501L);
        action.setScenario(scenario.name());action.setRunnerEpoch(1);action.setLeaseUntil(LocalDateTime.now().plusSeconds(60));
        when(actions.lockAction(action.getActionId())).thenReturn(Optional.of(action));
        return store.apply(action.getActionId(),1);
    }

    @Test void createsLocalLinkWithoutQrAndKeepsIdentityAcrossProviderReconstruction() {
        var result=provider.create(response);
        assertTrue(result.paymentLinkId().startsWith("MOCK_LINK_")); assertEquals("http://localhost:5173/payment/qr/501",result.checkoutUrl());
        assertNull(result.qrPayload()); assertEquals("PENDING",provider.queryPayment(order.getPayosOrderCode()).status());
        assertEquals(result,new MockPayOSProvider(store).query(order.getPayosOrderCode()));
        assertEquals(result,provider.create(response));
    }

    @Test void timeoutBeforeEffectIsDurableAndNeedsExplicitClosureCompletion() {
        action(MockPayOSScenario.ARM_CREATE_TIMEOUT_BEFORE);
        assertEquals(504,assertThrows(PaymentLinkException.class,()->provider.create(response)).getStatus());
        assertEquals("CLOSED_WITHOUT_EFFECT",state.getCreateEffectStatus()); assertNull(state.getPaymentLinkId());
        assertNull(provider.query(order.getPayosOrderCode()));
        assertThrows(PaymentLinkException.class,()->provider.create(response));
        action(MockPayOSScenario.COMPLETE_CREATE);
        assertNotNull(provider.query(order.getPayosOrderCode())); assertEquals(PaymentAttempt.Status.CREATING,attempt.getStatus());
    }

    @Test void timeoutAfterEffectReusesOriginalResultAndDoesNotCreateSecondLink() {
        action(MockPayOSScenario.ARM_CREATE_TIMEOUT_AFTER);
        assertEquals(504,assertThrows(PaymentLinkException.class,()->provider.create(response)).getStatus());
        String link=state.getPaymentLinkId(); assertNotNull(link);
        assertEquals(link,provider.query(order.getPayosOrderCode()).paymentLinkId());
        assertEquals(link,provider.create(response).paymentLinkId());
    }

    @Test void paidFactsRemainImmutableReplayDeduplicatesAndCoreAloneChangesMerchant() {
        provider.create(response); JsonNode paid=proof.decode(action(MockPayOSScenario.PAYMENT_PAID_WEBHOOK));
        JsonNode replay=proof.decode(action(MockPayOSScenario.REPLAY_WEBHOOK));
        assertEquals(paid,replay); assertEquals("PAID",provider.queryPayment(order.getPayosOrderCode()).status());
        assertEquals(PaymentAttempt.Status.CREATING,attempt.getStatus());assertEquals(OrderStatus.PENDING,order.getStatus());
        assertThrows(PaymentLinkException.class,()->action(MockPayOSScenario.PAYMENT_PAID_WEBHOOK));
        assertEquals("PAID",provider.cancelPayment(order.getPayosOrderCode()).status());
    }

    @Test void partialAndConflictingFactsDoNotEraseOriginalProviderMoney() {
        provider.create(response); action(MockPayOSScenario.PARTIAL_PAYMENT);
        assertEquals(new BigDecimal("50000"),state.getAmountPaid()); String original=state.getTransactionsJson();
        action(MockPayOSScenario.CONFLICTING_WEBHOOK);
        assertEquals(original,state.getTransactionsJson());assertEquals(new BigDecimal("50000"),state.getAmountPaid());
    }

    @Test void cancellationProcessingAndCompletionNeedFreshQuery() {
        provider.create(response);action(MockPayOSScenario.ARM_CANCEL_PROCESSING);
        assertEquals("PROCESSING",provider.cancelPayment(order.getPayosOrderCode()).status());
        action(MockPayOSScenario.COMPLETE_CANCEL_ZERO);
        assertEquals("CANCELLED",provider.queryPayment(order.getPayosOrderCode()).status());
    }

    @ParameterizedTest @EnumSource(value=MockPayOSScenario.class,names={"PAYMENT_FAILED","PAYMENT_CANCELLED","PAYMENT_EXPIRED"})
    void terminalProviderStatusDoesNotCancelOrder(MockPayOSScenario scenario) {
        provider.create(response);action(scenario);
        assertEquals(scenario.name().substring(8),provider.queryPayment(order.getPayosOrderCode()).status());
        assertEquals(OrderStatus.PENDING,order.getStatus());
    }

    @ParameterizedTest @EnumSource(value=MockPayOSScenario.class,names={"ARM_QUERY_TIMEOUT_BEFORE","ARM_QUERY_TIMEOUT_AFTER",
            "ARM_QUERY_502","ARM_QUERY_503","ARM_QUERY_504","ARM_QUERY_UNKNOWN"})
    void faultsAreOneShotAndNeverEraseProviderFacts(MockPayOSScenario scenario) {
        provider.create(response); String link=state.getPaymentLinkId();action(scenario);
        assertThrows(PaymentLinkException.class,()->provider.queryPayment(order.getPayosOrderCode()));
        assertEquals(link,provider.queryPayment(order.getPayosOrderCode()).paymentLinkId());
    }

    @Test void cancelTimeoutBeforeAndAfterEffectHaveDifferentDurableResults() {
        provider.create(response);action(MockPayOSScenario.ARM_CANCEL_TIMEOUT_BEFORE);
        assertThrows(PaymentLinkException.class,()->provider.cancelPayment(order.getPayosOrderCode()));
        assertEquals("PENDING",state.getProviderStatus());action(MockPayOSScenario.ARM_CANCEL_TIMEOUT_AFTER);
        assertThrows(PaymentLinkException.class,()->provider.cancelPayment(order.getPayosOrderCode()));
        assertEquals("CANCELLED",state.getProviderStatus());
    }

    @Test void latePaymentAfterCodPreservesProviderFactWithoutDirectOrderSettlement() {
        provider.create(response);provider.cancelPayment(order.getPayosOrderCode());order.setPaymentMethod("COD");
        action(MockPayOSScenario.LATE_PAYMENT_QUERY);
        assertEquals("PAID",state.getProviderStatus());assertEquals("COD",order.getPaymentMethod());
    }

    @Test void signedFactsRejectTamperingAndRealKeyCannotVerifyMock() {
        provider.create(response);var envelope=proof.webhook(proof.decode(action(MockPayOSScenario.PAYMENT_PAID_WEBHOOK)));
        var signatures=new PayOSService();ReflectionTestUtils.setField(signatures,"checksumKey","real-fixture-key");
        assertFalse(signatures.verifyWebhookPayload(envelope));
        ReflectionTestUtils.setField(signatures,"paymentMode","MOCK");ReflectionTestUtils.setField(signatures,"mockSigningKey","1".repeat(64));
        assertTrue(signatures.verifyWebhookPayload(envelope));
        ((com.fasterxml.jackson.databind.node.ObjectNode)envelope.get("data")).put("amount",1);
        assertFalse(signatures.verifyWebhookPayload(envelope));
    }
}
