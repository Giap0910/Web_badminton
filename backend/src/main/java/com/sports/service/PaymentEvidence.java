package com.sports.service;

import com.sports.entity.PaymentEvent;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;

public record PaymentEvidence(String paymentLinkId, Long orderCode, String reference, BigDecimal amount,
        String currency, String transactionDateTime, boolean successful, PaymentEvent.Source source) {
    private static final ZoneId PAYMENT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter BANK_TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss")
            .withResolverStyle(ResolverStyle.STRICT);

    public LocalDateTime paidAt() {
        try { return OffsetDateTime.parse(transactionDateTime).atZoneSameInstant(PAYMENT_ZONE).toLocalDateTime(); }
        catch (DateTimeParseException ignored) { return localTime(); }
    }

    private LocalDateTime localTime() {
        try { return LocalDateTime.parse(transactionDateTime, DateTimeFormatter.ISO_LOCAL_DATE_TIME); }
        catch (DateTimeParseException ignored) {
            try { return LocalDateTime.parse(transactionDateTime, BANK_TIME); }
            catch (DateTimeParseException invalid) { return null; }
        }
    }

    public List<String> immutableFacts() {
        var time = paidAt();
        return List.of("PAYOS", paymentLinkId, reference, orderCode.toString(), amount.toBigIntegerExact().toString(),
                currency, time == null ? transactionDateTime : time.toString());
    }
}
