package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.entity.*;
import com.sports.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class PaymentLedgerService {
    private final PaymentEventRepository events;
    private final PaymentEventConflictRepository conflicts;
    private final ObjectMapper json = new ObjectMapper();
    public record Receipt(PaymentEvent event, boolean duplicate, boolean conflict) {}

    public Receipt record(PaymentEvidence proof, PaymentAttempt attempt) {
        String fingerprint = hash(serialize(proof.immutableFacts()));
        var existing = events.findByProviderAndPaymentLinkIdAndReference("PAYOS", proof.paymentLinkId(), proof.reference());
        if (existing.isEmpty()) return new Receipt(create(proof, attempt, fingerprint), false, false);
        var event = existing.get();
        if (event.getFingerprint().equals(fingerprint)) return new Receipt(event, true, false);
        saveConflict(event, proof, fingerprint);
        return new Receipt(event, false, true);
    }

    private PaymentEvent create(PaymentEvidence proof, PaymentAttempt attempt, String fingerprint) {
        var event = new PaymentEvent();
        event.setProvider("PAYOS");
        event.setPaymentLinkId(proof.paymentLinkId());
        event.setOrderCode(proof.orderCode());
        event.setReference(proof.reference());
        event.setAmount(proof.amount());
        event.setCurrency(proof.currency());
        event.setTransactionDateTime(proof.transactionDateTime());
        event.setReceivedAt(LocalDateTime.now());
        event.setVerifiedAt(LocalDateTime.now());
        event.setSource(proof.source());
        event.setFingerprint(fingerprint);
        event.setReceivedPayment(proof.successful());
        event.setProcessingResult("RECEIVED");
        bind(event, attempt);
        return events.saveAndFlush(event);
    }

    private void saveConflict(PaymentEvent event, PaymentEvidence proof, String fingerprint) {
        if (conflicts.existsByPaymentEventIdAndFingerprint(event.getId(), fingerprint)) return;
        var audit = new PaymentEventConflict();
        audit.setPaymentEvent(event);
        audit.setFingerprint(fingerprint);
        audit.setIncomingFacts(serialize(proof));
        audit.setSource(proof.source());
        conflicts.saveAndFlush(audit);
    }

    public void bind(PaymentEvent event, PaymentAttempt attempt) {
        if (attempt == null || event.getPaymentAttempt() != null) return;
        event.setPaymentAttempt(attempt);
        event.setOrder(attempt.getOrder());
    }

    public List<PaymentEvent> received(Long attemptId) {
        return events.findByPaymentAttemptId(attemptId).stream()
                .filter(e -> e.isReceivedPayment() || "PAID".equals(e.getProcessingResult())).toList();
    }

    public boolean hasHardConflict(Long attemptId) {
        return conflicts.existsByPaymentEventPaymentAttemptId(attemptId)
                || events.findByPaymentAttemptId(attemptId).stream().anyMatch(e -> Set.of(
                        "IDENTITY_MISMATCH", "CURRENCY_MISMATCH", "EVENT_IDENTITY_CONFLICT")
                        .contains(e.getReviewReason() == null ? "" : e.getReviewReason()));
    }

    public String serialize(Object value) {
        try { return json.writeValueAsString(value); }
        catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalArgumentException(ex); }
    }

    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
