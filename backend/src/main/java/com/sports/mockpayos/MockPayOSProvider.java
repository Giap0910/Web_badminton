package com.sports.mockpayos;

import com.sports.dto.PaymentAttemptResponse;
import com.sports.service.*;
import com.sports.exception.PaymentLinkException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;

@Component @Profile("mock-payos") @RequiredArgsConstructor
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
@Transactional(propagation=Propagation.NEVER)
public class MockPayOSProvider implements PayOSGateway {
    private final MockPayOSStore store;

    @Override public PayOSPaymentClient.Result create(PaymentAttemptResponse attempt) {
        store.begin(attempt);
        checkFault(store.createEffect(attempt.orderCode()));
        return store.original(attempt.orderCode());
    }

    @Override public PayOSPaymentClient.Result query(Long code) {
        var observed=store.observe(code,false); checkFault(observed.fault());
        if (observed.query()==null) return null;
        return store.original(code);
    }

    @Override public PayOSPaymentClient.Query queryPayment(Long code) {
        var observed=store.observe(code,false); checkFault(observed.fault());
        return observed.query();
    }

    @Override public PayOSPaymentClient.Query cancelPayment(Long code) {
        var observed=store.observe(code,true); checkFault(observed.fault());
        return observed.query();
    }

    private void checkFault(String fault) {
        if (fault.contains("TIMEOUT") || fault.endsWith("504")) throw unavailable(504);
        if (fault.endsWith("503")) throw unavailable(503);
        if (fault.endsWith("502") || "QUERY_UNKNOWN".equals(fault)) throw MockPayOSProof.invalid();
    }
    private PaymentLinkException unavailable(int status) {
        return new PaymentLinkException(status,"PAYOS_UNAVAILABLE","Provider mô phỏng chưa trả kết quả; kiểm tra lại cùng đơn");
    }
}
