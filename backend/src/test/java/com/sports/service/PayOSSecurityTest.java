package com.sports.service;

import com.sports.dto.PayOSWebhookData;
import com.sports.dto.PayOSWebhookRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import com.sports.controller.PaymentController;
import com.sports.entity.User;
import com.sports.entity.Role;
import com.sports.security.CustomUserDetails;
import com.sports.security.JwtAuthenticationFilter;
import com.sports.security.JwtTokenProvider;
import com.sports.security.UserDetailsServiceImpl;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.mockito.Mockito.*;

import static org.junit.jupiter.api.Assertions.*;

class PayOSSecurityTest {

    private PayOSService payosService;
    private final String testChecksumKey = "unit-test-only-checksum-not-a-production-secret";

    @Test
    void mockPaymentIsDisabledByDefault() {
        PaymentSettlementService orders = mock(PaymentSettlementService.class);
        PaymentController controller = new PaymentController(payosService, new PaymentWebhookService(payosService, orders), new MockEnvironment());
        assertEquals(404, controller.triggerMockWebhook(1L, BigDecimal.TEN).getStatusCode().value());
        verifyNoInteractions(orders);
    }

    @Test
    void mockPaymentRequiresDevelopmentProfileEvenWhenEnabled() {
        PaymentSettlementService orders = mock(PaymentSettlementService.class);
        PaymentController controller = new PaymentController(payosService, new PaymentWebhookService(payosService, orders), new MockEnvironment());
        ReflectionTestUtils.setField(controller, "mockEnabled", true);
        assertEquals(404, controller.triggerMockWebhook(1L, BigDecimal.TEN).getStatusCode().value());
        verifyNoInteractions(orders);
    }

    @Test
    void developmentMockCanBeExplicitlyEnabled() {
        PaymentSettlementService orders = mock(PaymentSettlementService.class);
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        PaymentController controller = new PaymentController(payosService, new PaymentWebhookService(payosService, orders), environment);
        ReflectionTestUtils.setField(controller, "mockEnabled", true);
        assertEquals(200, controller.triggerMockWebhook(1L, BigDecimal.TEN).getStatusCode().value());
        verify(orders).webhook(argThat(p -> p.successful() && p.orderCode().equals(1L)));
    }

    @Test
    void failedPaymentDoesNotMarkOrderPaid() {
        PayOSService signatures = mock(PayOSService.class);
        PaymentSettlementService orders = mock(PaymentSettlementService.class);
        PayOSWebhookRequest request = payosService.generateMockWebhook(1L, BigDecimal.TEN);
        request.getData().setCode("01");
        when(signatures.verifyWebhookPayload(any())).thenReturn(true);
        PaymentController controller = new PaymentController(payosService, new PaymentWebhookService(signatures, orders), new MockEnvironment());
        assertEquals(200, controller.handlePayOSWebhook(request).getStatusCode().value());
        verify(orders).webhook(argThat(p -> !p.successful()));
    }

    @Test
    void invalidWebhookNeverUpdatesAnOrder() {
        PaymentSettlementService orders = mock(PaymentSettlementService.class);
        PaymentController controller = new PaymentController(payosService, new PaymentWebhookService(payosService, orders), new MockEnvironment());
        PayOSWebhookRequest request = payosService.generateMockWebhook(1L, BigDecimal.TEN);
        request.setSignature("invalid");
        assertEquals(401, controller.handlePayOSWebhook(request).getStatusCode().value());
        verifyNoInteractions(orders);
    }

    @Test
    void lockedAccountIsDisabledAndLocked() {
        CustomUserDetails details = new CustomUserDetails(User.builder()
                .username("locked").role(Role.ROLE_USER).isActive(false).build());
        assertFalse(details.isEnabled());
        assertFalse(details.isAccountNonLocked());
    }

    @Test
    void existingJwtCannotAuthenticateLockedAccount() throws Exception {
        JwtTokenProvider tokens = mock(JwtTokenProvider.class);
        UserDetailsServiceImpl users = mock(UserDetailsServiceImpl.class);
        when(tokens.validateToken("existing-token")).thenReturn(true);
        when(tokens.getUsernameFromJwt("existing-token")).thenReturn("locked");
        when(users.loadUserByUsername("locked")).thenReturn(new CustomUserDetails(User.builder()
                .username("locked").role(Role.ROLE_USER).isActive(false).build()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer existing-token");
        jakarta.servlet.FilterChain chain = mock(jakarta.servlet.FilterChain.class);
        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
        try {
            new JwtAuthenticationFilter(tokens, users).doFilter(request, response, chain);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
            verify(chain, times(1)).doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @BeforeEach
    void setUp() {
        payosService = new PayOSService();
        ReflectionTestUtils.setField(payosService, "checksumKey", testChecksumKey);
        ReflectionTestUtils.setField(payosService, "returnUrl", "http://localhost:5173/orders/success");
        ReflectionTestUtils.setField(payosService, "cancelUrl", "http://localhost:5173/orders/cancel");
    }

    @Test
    @DisplayName("Bảo mật chữ ký số: Chữ ký HMAC-SHA256 hợp lệ được xác thực thành công")
    void testVerifyWebhookSignature_ValidSignature() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertTrue(isValid, "Chữ ký số hợp lệ phải được chấp nhận");
    }

    @Test
    @DisplayName("Chống giả mạo: Từ chối dứt khoát nếu chữ ký HMAC-SHA256 bị sai lệch hoặc giả mạo")
    void testVerifyWebhookSignature_TamperedSignature() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        // Cố tình sửa chữ ký giả mạo
        mockWebhook.setSignature("bad_fake_signature_abc1234567890abcdef");

        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertFalse(isValid, "Chữ ký giả mạo phải bị từ chối ngay lập tức");
    }

    @Test
    @DisplayName("Chống Parameter Tampering: Dữ liệu thanh toán bị sửa giá sẽ làm sai lệch HMAC-SHA256")
    void testVerifyWebhookSignature_TamperedAmount() {
        PayOSWebhookRequest mockWebhook = payosService.generateMockWebhook(123456L, new BigDecimal("4250000"));
        // Hacker sửa giá từ 4.250.000 xuống 1.000 VNĐ nhưng giữ nguyên chữ ký cũ
        mockWebhook.getData().setAmount(new BigDecimal("1000"));

        boolean isValid = payosService.verifyWebhookSignature(mockWebhook);
        assertFalse(isValid, "Thay đổi số tiền trong payload mà không có secret key phải làm hỏng chữ ký");
    }
}
