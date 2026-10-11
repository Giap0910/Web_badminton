package com.sports.mockpayos;

import com.sports.repository.PaymentAttemptRepository;
import com.sports.security.CustomUserDetails;
import com.sports.service.PaymentEnvironmentService;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.ResponseEntity;
import java.math.BigDecimal;
import java.util.*;

@Service @Profile("dev & mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name={"payos.mock-verified","payos.mock-enabled"},havingValue="true")
public class MockPayOSLegacyService {
    private final PaymentAttemptRepository attempts;
    private final MockPayOSActionService actions;
    private final MockPayOSProof proof;
    private final PaymentEnvironmentService environment;
    private final MockPayOSActionRepository intents;

    public ResponseEntity<Map<String,Object>> trigger(Long code,BigDecimal amount) {
        environment.requireMock();
        var actor=adminActor();
        var attempt=validatedAttempt(code,amount);
        String key=intentKey(actor.getId(),attempt.getOrder().getId());
        String scenario=intents.findByActorIdAndOrderIdAndIdempotencyKey(actor.getId(),attempt.getOrder().getId(),key)
                .map(MockPayOSAction::getScenario).orElse(attempt.getReference()==null?"PAYMENT_PAID_WEBHOOK":"REPLAY_WEBHOOK");
        actions.submit(attempt.getOrder().getId(),actor.getId(),key,proof.object().put("scenario",scenario));
        var body=new HashMap<String,Object>(); body.put("error",0); body.put("message","Đã tiếp nhận"); body.put("data",null);
        return ResponseEntity.ok(body);
    }

    private CustomUserDetails adminActor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if (auth==null || !(auth.getPrincipal() instanceof CustomUserDetails actor)
                || auth.getAuthorities().stream().noneMatch(a->"ROLE_ADMIN".equals(a.getAuthority()))) {
            throw new PaymentLinkException(403,"FORBIDDEN","Không có quyền mô phỏng");
        }
        return actor;
    }

    private com.sports.entity.PaymentAttempt validatedAttempt(Long code,BigDecimal amount) {
        var attempt=attempts.findByOrderCode(code).orElseThrow(MockPayOSStore::missing);
        if (amount==null || amount.compareTo(attempt.getAmount())!=0 || amount.stripTrailingZeros().scale()>0) {
            throw new PaymentLinkException(400,"INVALID_MOCK_ACTION","Số tiền phải khớp đơn mô phỏng");
        }
        return attempt;
    }

    private String intentKey(Long actor,Long order) {
        byte[] hash=java.util.HexFormat.of().parseHex(com.sports.service.PaymentLedgerService.hash("legacy:"+actor+":"+order));
        hash[6]=(byte)((hash[6]&0x0f)|0x40); hash[8]=(byte)((hash[8]&0x3f)|0x80);
        var bytes=java.nio.ByteBuffer.wrap(hash);
        return new UUID(bytes.getLong(),bytes.getLong()).toString();
    }
}
