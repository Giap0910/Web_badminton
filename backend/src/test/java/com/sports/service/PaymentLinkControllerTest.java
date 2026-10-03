package com.sports.service;

import com.sports.controller.OrderPaymentController;
import com.sports.dto.PaymentAttemptResponse;
import com.sports.entity.*;
import com.sports.exception.*;
import com.sports.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

class PaymentLinkControllerTest {
    private final PaymentAttemptStore store = mock(PaymentAttemptStore.class);
    private final PayOSPaymentClient client = mock(PayOSPaymentClient.class);
    private final PaymentLinkService service = new PaymentLinkService(store, client);
    private final String key = UUID.randomUUID().toString();

    @Test
    void securityRequiresLoginAndInvalidUuidDoesNotTouchStore() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mvc.perform(post("/api/orders/2/payment-link").header("Idempotency-Key", key))
                    .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_IDEMPOTENCY_KEY"));
            verifyNoInteractions(store, client);
        }
    }

    @Test
    void newExistingAndUnresolvedHaveCorrectHttpStatuses() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            var creating = attempt(PaymentAttempt.Status.CREATING, null);
            var pending = attempt(PaymentAttempt.Status.PENDING, "https://pay.payos.vn/web/test");
            when(store.prepare(2L, 1L, key)).thenReturn(new PaymentAttemptStore.Prepared(creating, true),
                    new PaymentAttemptStore.Prepared(pending, false), new PaymentAttemptStore.Prepared(creating, false));
            var result = new PayOSPaymentClient.Result(123L, BigDecimal.TEN, "test", pending.checkoutUrl(), null);
            when(client.create(creating)).thenReturn(result);
            when(store.saveResult(2L, 1L, result, true)).thenReturn(pending);
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.checkoutUrl").value(pending.checkoutUrl()));
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                    .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("CREATING"));
            verify(client, times(1)).create(any());
            verify(client).query(123L);
        }
    }

    @Test
    void forbiddenAndGatewayErrorsHaveSanitizedContract() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            for (int code : new int[] {403, 404, 409, 502, 503, 504}) {
                doThrow(new PaymentLinkException(code, "PAYMENT_ERROR", "Lỗi kiểm thử"))
                        .when(store).prepare(2L, 1L, key);
                mvc.perform(post("/api/orders/2/payment-link").with(user(principal())).header("Idempotency-Key", key))
                        .andExpect(status().is(code)).andExpect(jsonPath("$.code").value("PAYMENT_ERROR"))
                        .andExpect(jsonPath("$.path").value("/api/orders/2/payment-link"));
            }
        }
    }

    private CustomUserDetails principal() {
        return new CustomUserDetails(User.builder().id(1L).username("test").role(Role.ROLE_USER).build());
    }

    private PaymentAttemptResponse attempt(PaymentAttempt.Status status, String url) {
        return new PaymentAttemptResponse(1L, 2L, "PAYOS", 123L, null, BigDecimal.TEN, "VND",
                status, url, null, LocalDateTime.now().plusMinutes(15), null, null, null);
    }

    private AnnotationConfigWebApplicationContext context() {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(SecurityConfig.class, OrderPaymentController.class, GlobalExceptionHandler.class, WebConfig.class);
        context.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("paymentLinkService", service);
            factory.registerSingleton("jwtAuthenticationFilter", new JwtAuthenticationFilter(
                    mock(JwtTokenProvider.class), mock(UserDetailsServiceImpl.class)));
        });
        context.refresh();
        return context;
    }

    @Configuration @EnableWebMvc
    static class WebConfig {}
}
