package com.sports.service;

import com.sports.dto.PaymentEnvironmentResponse;
import com.sports.exception.PaymentLinkException;
import org.springframework.core.env.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;

@Service
public class PaymentEnvironmentService {
    private final Environment environment;
    public PaymentEnvironmentService(Environment environment) { this.environment=environment; }

    public String mode() {
        String mode=environment.getProperty("payos.mode","REAL");
        if (!"REAL".equals(mode) && !"MOCK".equals(mode)) throw new IllegalStateException("Chế độ thanh toán không hợp lệ");
        if ("MOCK".equals(mode)) requireMock();
        return mode;
    }

    public void requireMock() {
        if (!"MOCK".equals(environment.getProperty("payos.mode"))
                || !Boolean.parseBoolean(environment.getProperty("payos.mock-verified","false"))
                || !environment.acceptsProfiles(Profiles.of("mock-payos & (dev | test) & !prod & !production"))) {
            throw new PaymentLinkException(503,"PAYOS_UNAVAILABLE","Môi trường mô phỏng chưa được xác minh");
        }
    }

    public PaymentEnvironmentResponse read(Authentication authentication) {
        boolean admin=authentication!=null && authentication.getAuthorities().stream()
                .anyMatch(a->"ROLE_ADMIN".equals(a.getAuthority()));
        return new PaymentEnvironmentResponse(mode(),"MOCK".equals(mode()) && admin);
    }
}
