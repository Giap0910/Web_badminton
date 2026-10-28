package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.mockpayos.*;
import com.sports.repository.*;
import com.sports.entity.*;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.*;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MockPayOSActionTest {
    private final ObjectMapper json=new ObjectMapper();
    private MockPayOSActionRepository repository;
    private MockPayOSActionStore store;
    private MockPayOSActionService service;
    private MockPayOSStore provider;
    private PaymentWebhookService webhooks;
    private MockPayOSRecovery recovery;
    private MockPayOSAction action;
    private MockPayOSActionStore actionBoundary;

    @BeforeEach void arrange() {
        repository=mock(MockPayOSActionRepository.class);var orders=mock(OrderRepository.class);
        provider=mock(MockPayOSStore.class);webhooks=mock(PaymentWebhookService.class);recovery=mock(MockPayOSRecovery.class);
        store=new MockPayOSActionStore(repository,orders,mock(OrderService.class),mock(PaymentAttemptStore.class),provider);
        actionBoundary=mock(MockPayOSActionStore.class);
        service=new MockPayOSActionService(actionBoundary,provider,new MockPayOSProof(new PayOSService(),json,"1".repeat(64)),webhooks,recovery);
        when(orders.findByIdForUpdate(501L)).thenReturn(Optional.of(com.sports.entity.Order.builder().id(501L).payosOrderCode(1000000501L).build()));
        when(repository.saveAndFlush(any())).thenAnswer(i->{action=i.getArgument(0);return action;});
    }

    @ParameterizedTest @ValueSource(strings={"{}","null","[]","{\"scenario\":null}","{\"scenario\":123}",
            "{\"scenario\":\"INVALID\"}","{\"scenario\":\"PAYMENT_PAID_WEBHOOK\",\"amount\":1}",
            "{\"scenario\":\"PAYMENT_PAID_WEBHOOK\",\"status\":\"PAID\"}","{\"scenario\":\"PAYMENT_PAID_WEBHOOK\",\"orderCode\":1}"})
    void strictScenarioValidationNeverCreatesIntentOrPayment(String body) throws Exception {
        assertEquals(400,assertThrows(PaymentLinkException.class,()->service.submit(501L,9L,UUID.randomUUID().toString(),json.readTree(body))).getStatus());
        verifyNoInteractions(actionBoundary,provider,webhooks,recovery);
    }

    @ParameterizedTest @ValueSource(strings={"invalid","00000000-0000-0000-0000-000000000000","00000000-0000-1000-8000-000000000000"})
    void keyMustBeRfc4122VersionFour(String key) throws Exception {
        assertEquals("INVALID_IDEMPOTENCY_KEY",assertThrows(PaymentLinkException.class,
                ()->service.submit(501L,9L,key,json.readTree("{\"scenario\":\"PAYMENT_PAID_WEBHOOK\"}"))).getCode());
        verifyNoInteractions(actionBoundary,provider);
    }

    @Test void sameKeyHasStableIdAndLeaseButDifferentBodyConflicts() {
        String key=UUID.randomUUID().toString();var first=store.prepare(501L,9L,key,MockPayOSScenario.PAYMENT_PAID_QUERY);
        when(repository.findByActorIdAndOrderIdAndIdempotencyKey(9L,501L,key)).thenReturn(Optional.of(action));
        var second=store.prepare(501L,9L,key,MockPayOSScenario.PAYMENT_PAID_QUERY);
        assertEquals(first.actionId(),second.actionId());assertFalse(second.claimed());assertTrue(second.replay());
        assertEquals("IDEMPOTENCY_CONFLICT",assertThrows(PaymentLinkException.class,
                ()->store.prepare(501L,9L,key,MockPayOSScenario.PAYMENT_FAILED)).getCode());
    }

    @Test void differentKeyCannotReplaceUnresolvedIntentAndLeaseReclaimFencesOldRunner() {
        String key=UUID.randomUUID().toString();var first=store.prepare(501L,9L,key,MockPayOSScenario.PAYMENT_PAID_QUERY);
        when(repository.findByOrderIdAndStatus(501L,"VERIFYING")).thenReturn(List.of(action));
        assertEquals("MOCK_ACTION_CONFLICT",assertThrows(PaymentLinkException.class,
                ()->store.prepare(501L,9L,UUID.randomUUID().toString(),MockPayOSScenario.PAYMENT_PAID_QUERY)).getCode());
        action.setLeaseUntil(LocalDateTime.now().minusSeconds(1));
        when(repository.findByActorIdAndOrderIdAndIdempotencyKey(9L,501L,key)).thenReturn(Optional.of(action));
        when(repository.lockAction(action.getActionId())).thenReturn(Optional.of(action));
        var current=store.prepare(501L,9L,key,MockPayOSScenario.PAYMENT_PAID_QUERY);
        assertTrue(current.epoch()>first.epoch());assertThrows(PaymentLinkException.class,()->store.complete(first));
        store.complete(current);assertEquals("APPLIED",action.getStatus());
    }

    @Test void durableProviderEffectIsNotReexecutedOnTerminalReplay() throws Exception {
        var runner=new MockPayOSActionStore.Runner(UUID.randomUUID().toString(),1,false,true);
        when(actionBoundary.prepare(any(),any(),any(),any())).thenReturn(runner);
        service.submit(501L,9L,UUID.randomUUID().toString(),json.readTree("{\"scenario\":\"PAYMENT_PAID_WEBHOOK\"}"));
        verify(actionBoundary).reply(runner);verifyNoInteractions(provider,webhooks,recovery);
    }
}
