package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.controller.*;
import com.sports.mockpayos.*;
import com.sports.security.*;
import com.sports.entity.*;
import com.sports.entity.Role;
import com.sports.exception.PaymentLinkException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockServletContext;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

class MockPayOSApiTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private MockPayOSActionService actions;

    @BeforeEach void start() {
        startMode("MOCK");
    }
    private void startMode(String mode) {
        context=new AnnotationConfigWebApplicationContext();context.setServletContext(new MockServletContext());
        var env=new MockEnvironment().withProperty("payos.mode",mode).withProperty("payos.mock-verified","MOCK".equals(mode)?"true":"false")
                .withProperty("app.jwt.secret","2".repeat(64));env.setActiveProfiles("MOCK".equals(mode)?new String[]{"test","mock-payos"}:new String[]{"test"});context.setEnvironment(env);
        context.register(Config.class);context.refresh();actions=context.getBean(MockPayOSActionService.class);
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    @AfterEach void close() { if(context!=null)context.close(); }

    private String token(Role role) {
        var principal=new CustomUserDetails(User.builder().id(9L).username(role.name()).role(role).isActive(true).build());
        return context.getBean(JwtTokenProvider.class).generateToken(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }

    @Test void environmentRequiresJwtAndControlsOnlyAdmin() throws Exception {
        mvc.perform(get("/api/payment/environment")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/payment/environment").header("Authorization","Bearer "+token(Role.ROLE_USER)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentMode").value("MOCK"))
                .andExpect(jsonPath("$.simulationControlsAllowed").value(false));
        mvc.perform(get("/api/payment/environment").header("Authorization","Bearer "+token(Role.ROLE_ADMIN)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.simulationControlsAllowed").value(true));
    }

    @Test void customerCannotOperateEvenOwnedOrderAndAnonymousGets401() throws Exception {
        mvc.perform(post("/api/dev/mock-payos/orders/501/actions").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.errors").isMap());
        mvc.perform(post("/api/dev/mock-payos/orders/501/actions").header("Authorization","Bearer "+token(Role.ROLE_USER))
                .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(actions);
    }

    @Test void realMetadataAndAdminRequestsHaveNoSimulationMapping() throws Exception {
        context.close();startMode("REAL");
        mvc.perform(get("/api/payment/environment").header("Authorization","Bearer "+token(Role.ROLE_ADMIN)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentMode").value("REAL"))
                .andExpect(jsonPath("$.simulationControlsAllowed").value(false));
        mvc.perform(post("/api/dev/mock-payos/orders/501/actions").header("Authorization","Bearer "+token(Role.ROLE_ADMIN))
                .contentType("application/json").content("{}")) .andExpect(status().isNotFound());
        verifyNoInteractions(actions);
    }

    @ParameterizedTest @ValueSource(ints={400,404,409,502,503,504})
    void adminReceivesExactErrorSchemaAndNoSuccessOnFailure(int status) throws Exception {
        when(actions.submit(any(),any(),any(),any())).thenThrow(new PaymentLinkException(status,"FIXTURE_ERROR","Mô phỏng lỗi"));
        mvc.perform(post("/api/dev/mock-payos/orders/501/actions").header("Authorization","Bearer "+token(Role.ROLE_ADMIN))
                .header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"scenario\":\"PAYMENT_PAID_WEBHOOK\"}"))
                .andExpect(status().is(status)).andExpect(jsonPath("$.code").value("FIXTURE_ERROR"))
                .andExpect(jsonPath("$.timestamp").exists()).andExpect(jsonPath("$.path").value("/api/dev/mock-payos/orders/501/actions"));
    }

    @Test void verifyingReplyIs202WithRetryAfterAndNoDataEnvelope() throws Exception {
        var view=new MockPayOSActionStore.ActionView(UUID.randomUUID().toString(),"PAYMENT_PAID_WEBHOOK","VERIFYING",null,UUID.randomUUID().toString(),10);
        when(actions.submit(any(),any(),any(),any())).thenReturn(new MockPayOSActionStore.Response("MOCK",501L,7,view,"PENDING",null,null,false));
        mvc.perform(post("/api/dev/mock-payos/orders/501/actions").header("Authorization","Bearer "+token(Role.ROLE_ADMIN))
                .contentType("application/json").content("{\"scenario\":\"PAYMENT_PAID_WEBHOOK\"}"))
                .andExpect(status().isAccepted()).andExpect(header().string("Retry-After","10"))
                .andExpect(jsonPath("$.action.status").value("VERIFYING")).andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test void allOrderPaymentAndAdminResponsesReceiveServerModeMetadata() {
        var payment=com.sports.dto.AdminPaymentDto.builder().id(1L).orderId(501L).provider("PAYOS").build();
        var tree=(com.fasterxml.jackson.databind.JsonNode)context.getBean(MockPayOSResponseAdvice.class)
                .beforeBodyWrite(payment,null,null,null,null,null);
        assertEquals("MOCK",tree.path("paymentMode").asText());assertEquals("PENDING",tree.path("mockProviderStatus").asText());
        var dto=com.sports.dto.OrderResponse.builder().id(501L).paymentMethod("COD").build();
        tree=(com.fasterxml.jackson.databind.JsonNode)context.getBean(MockPayOSResponseAdvice.class)
                .beforeBodyWrite(dto,null,null,null,null,null);
        assertEquals("MOCK",tree.path("paymentMode").asText());assertEquals("COD",tree.path("paymentMethod").asText());
    }

    @Test void legacyErrorsKeepExistingEnvelopeAndNeverReportSuccess() {
        var controller=new MockPayOSLegacyController(mock(MockPayOSLegacyService.class));
        var reply=controller.paymentError(new PaymentLinkException(400,"INVALID_MOCK_ACTION","Sai số tiền"));
        assertEquals(400,reply.getStatusCode().value());assertEquals(1,reply.getBody().get("error"));
        assertFalse(reply.getBody().containsKey("data"));
        assertEquals(-1,controller.paymentError(new PaymentLinkException(401,"INVALID_SIGNATURE","Sai chữ ký")).getBody().get("error"));
    }

    @Configuration @EnableWebMvc
    @Import({SecurityConfig.class,PaymentEnvironmentController.class,PaymentEnvironmentService.class,MockPayOSController.class,MockPayOSExceptionAdvice.class,MockPayOSResponseAdvice.class})
    static class Config {
        @Bean static PropertySourcesPlaceholderConfigurer properties() { return new PropertySourcesPlaceholderConfigurer(); }
        @Bean MockPayOSActionService actions() { return mock(MockPayOSActionService.class); }
        @Bean ObjectMapper json() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean MockPayOSStore provider() { var store=mock(MockPayOSStore.class);when(store.status(any())).thenReturn("PENDING");return store; }
        @Bean JwtTokenProvider tokens() { return new JwtTokenProvider(); }
        @Bean UserDetailsServiceImpl users() {
            var users=mock(UserDetailsServiceImpl.class);
            when(users.loadUserByUsername(anyString())).thenAnswer(i->{var role=Role.valueOf(i.getArgument(0));
                return new CustomUserDetails(User.builder().id(9L).username(role.name()).role(role).isActive(true).build());});
            return users;
        }
        @Bean JwtAuthenticationFilter filter(JwtTokenProvider tokens,UserDetailsServiceImpl users) { return new JwtAuthenticationFilter(tokens,users); }
    }
}
