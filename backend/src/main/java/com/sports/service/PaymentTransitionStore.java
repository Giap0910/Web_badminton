package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.dto.*;
import com.sports.dto.CheckoutContextResponse.OperationContext;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class PaymentTransitionStore {
    private final OrderRepository orders;
    private final PaymentAttemptRepository attempts;
    private final PaymentMethodTransitionRepository transitions;
    private final ProductRepository products;
    private final VoucherRepository vouchers;
    private final OrderService orderService;
    private final PaymentTransitionGuard guard;
    private final PaymentTransitionPolicy policy;
    private final PaymentSettlementService settlement;
    private final ObjectMapper json;
    private final EntityManager em;

    public record Locked(Order order, PaymentAttempt attempt, PaymentMethodTransition operation) {}
    public record Runner(Long orderId, Long userId, long epoch, Long code, boolean claimed,
            String operationId, String target) {
        public Runner(Long id, Long owner, long epoch, Long code, boolean claimed) {
            this(id, owner, epoch, code, claimed, null, "COD");
        }
    }
    public record Outcome(int status, String error, PaymentTransitionResponse body) {}

    @Transactional(readOnly = true)
    public void authorize(Long id, Long owner) {
        validateId(id);
        authorize(orders.findById(id).orElseThrow(this::missing), owner);
    }

    @Transactional
    public CheckoutContextResponse context(Long id, Long owner) {
        var state = lockOwned(id, owner);
        return new CheckoutContextResponse(orderService.snapshot(state.order()), payment(state.attempt()),
                state.order().getCheckoutRevision(), policy.eligibility(state.order(), state.attempt(), state.operation()),
                operation(state.operation()));
    }

    @Transactional
    public String prepare(Long id, Long owner, String key, PaymentTransitionRequest request) {
        var state = lockOwned(id, owner);
        var replay = transitions.findByOrderIdAndIdempotencyKey(id, key).orElse(null);
        if (replay != null) {
            if (!request.fingerprint().equals(replay.getRequestHash())) throw error("IDEMPOTENCY_CONFLICT");
            return replay.getOperationId();
        }
        requireIdle(state, request);
        if (state.order().getCheckoutRevision() != request.expectedStateVersion()) throw error("STALE_ORDER_STATE");
        if ("COD".equals(request.targetPaymentMethod())) policy.requireEligible(state.order(), state.attempt());
        else policy.requireReverseEligible(state.order(), state.attempt());
        validateReservation(state.order());
        var saved = transitions.saveAndFlush(draft(state, key, request));
        CheckoutRevision.touch(state.order());
        return saved.getOperationId();
    }

    private void requireIdle(Locked state, PaymentTransitionRequest request) {
        var op = state.operation();
        if (op == null) return;
        if (op.getStatus() == PaymentMethodTransition.Status.VERIFYING) throw PaymentTransitionGuard.conflict();
        if (op.getStatus() == PaymentMethodTransition.Status.NEEDS_REVIEW) throw PaymentTransitionGuard.reviewRequired();
        if (state.order().getPaymentMethod().equals(request.targetPaymentMethod())) throw PaymentTransitionGuard.conflict();
    }

    private PaymentMethodTransition draft(Locked state, String key, PaymentTransitionRequest request) {
        var op = new PaymentMethodTransition();
        op.setOperationId(UUID.randomUUID().toString());
        op.setOrder(state.order());
        op.setPaymentAttempt(state.attempt());
        op.setActor(state.order().getUser());
        op.setIdempotencyKey(key);
        op.setRequestHash(request.fingerprint());
        op.setExpectedStateVersion(request.expectedStateVersion());
        op.setSourceMethod(state.order().getPaymentMethod());
        op.setTargetMethod(request.targetPaymentMethod());
        op.setOriginalExpiresAt(state.order().getExpiresAt() == null
                ? LocalDateTime.now().plusMinutes(15) : state.order().getExpiresAt());
        op.setCreatedAt(LocalDateTime.now());
        op.setUpdatedAt(op.getCreatedAt());
        copyProvider(op, state.attempt());
        return op;
    }

    private void copyProvider(PaymentMethodTransition op, PaymentAttempt attempt) {
        if (attempt == null) {
            op.setAmount(op.getOrder().getTotalAmount());
            op.setCurrency("VND");
            return;
        }
        op.setProviderOrderCode(attempt.getOrderCode());
        op.setProviderLinkId(attempt.getPaymentLinkId());
        op.setAmount(attempt.getAmount());
        op.setCurrency(attempt.getCurrency());
    }

    @Transactional
    public Runner claim(Long id, Long owner) {
        return claim(id, owner, null);
    }

    @Transactional
    public Runner claim(Long id, Long owner, String operationId) {
        var state = lockOperation(id, owner, operationId);
        var op = state.operation();
        if (op == null) throw PaymentTransitionGuard.conflict();
        if (!continueOperation(state)) return runner(state, owner, false);
        if (op.getLeaseUntil() != null && op.getLeaseUntil().isAfter(LocalDateTime.now())) {
            return runner(state, owner, false);
        }
        op.setRunnerEpoch(Math.addExact(op.getRunnerEpoch(), 1));
        op.setLeaseUntil(LocalDateTime.now().plusSeconds(60));
        op.setUpdatedAt(LocalDateTime.now());
        return runner(state, owner, true);
    }

    private Runner runner(Locked state, Long owner, boolean claimed) {
        var op = state.operation();
        return new Runner(state.order().getId(), owner, op.getRunnerEpoch(), op.getProviderOrderCode(),
                claimed, op.getOperationId(), op.getTargetMethod());
    }

    private Locked lockOperation(Long id, Long owner, String operationId) {
        var state = lockOwned(id, owner);
        if (operationId == null) return state;
        var op = transitions.findByOperationId(operationId).orElseThrow(PaymentTransitionGuard::conflict);
        if (!op.getOrder().getId().equals(id)) throw PaymentTransitionGuard.conflict();
        return new Locked(state.order(), state.attempt(), op);
    }

    @Transactional
    public boolean renew(Runner runner) {
        var state = lockOperation(runner.orderId(), runner.userId(), runner.operationId());
        var op = state.operation();
        if (!continueOperation(state) || op.getRunnerEpoch() != runner.epoch()) return false;
        op.setLeaseUntil(LocalDateTime.now().plusSeconds(60));
        op.setUpdatedAt(LocalDateTime.now());
        return true;
    }

    private boolean continueOperation(Locked state) {
        var op = state.operation();
        if (op.getStatus() != PaymentMethodTransition.Status.VERIFYING) return false;
        if (state.order().getStatus() == OrderStatus.PAID) reject(op, "PAYMENT_ALREADY_SETTLED", false);
        else if (historyBlocked(state)) reject(op, "PAYMENT_REQUIRES_REVIEW", true);
        else if (state.order().getStatus() != OrderStatus.PENDING) reject(op, "ORDER_NOT_ELIGIBLE", false);
        else if (!op.getOriginalExpiresAt().isAfter(LocalDateTime.now())) {
            orderService.expireOrder(state.order().getId());
            reject(op, "ORDER_NOT_ELIGIBLE", false);
        }
        return op.getStatus() == PaymentMethodTransition.Status.VERIFYING;
    }

    private boolean historyBlocked(Locked state) {
        try { guard.checkHistory(state.order(), null); return false; }
        catch (PaymentLinkException ex) { return true; }
    }

    @Transactional
    public Outcome observe(Runner runner, PayOSPaymentClient.Query proof, PaymentEvent.Source source, boolean finalize) {
        var state = lockOperation(runner.orderId(), runner.userId(), runner.operationId());
        var op = state.operation();
        audit(op, source.name(), proof);
        if (proof == null) return outcome(state, true);
        settlement.query(state.attempt().getId(), proof, source);
        if (!policy.zero(proof) && !guard.hasMoney(state.attempt()) && !guard.needsReview(state.attempt())) {
            settlement.requireReview(state.attempt().getId(), "PAYMENT_EVIDENCE_MISMATCH");
        }
        if (!continueOperation(state) || op.getRunnerEpoch() != runner.epoch()) return outcome(state, true);
        if (finalize && guard.safeTerminal(op, proof)) apply(state, proof);
        return outcome(state, false);
    }

    private void apply(Locked state, PayOSPaymentClient.Query proof) {
        policy.requireEligible(state.order(), state.attempt());
        validateReservation(state.order());
        var op = state.operation();
        state.order().setPaymentMethod("COD");
        state.order().setExpiresAt(null);
        state.attempt().setStatus(PaymentAttempt.Status.valueOf(proof.status()));
        op.setStatus(PaymentMethodTransition.Status.APPLIED);
        op.setReason(null);
        op.setAppliedAt(LocalDateTime.now());
        op.setFinishedAt(op.getAppliedAt());
        op.setUpdatedAt(op.getAppliedAt());
        op.setLeaseUntil(null);
        CheckoutRevision.touch(state.order());
        op.setResult(serialize(Map.of("orderId", state.order().getId(), "attemptId", state.attempt().getId(),
                "targetPaymentMethod", "COD", "retiredStatus", proof.status(),
                "appliedStateVersion", state.order().getCheckoutRevision(), "appliedAt", offset(op.getAppliedAt()))));
    }

    private void reject(PaymentMethodTransition op, String reason, boolean review) {
        if (op.getStatus() != PaymentMethodTransition.Status.VERIFYING) return;
        op.setStatus(review ? PaymentMethodTransition.Status.NEEDS_REVIEW : PaymentMethodTransition.Status.REJECTED);
        op.setReason(reason);
        op.setFinishedAt(LocalDateTime.now());
        op.setUpdatedAt(LocalDateTime.now());
        op.setLeaseUntil(null);
        CheckoutRevision.touch(op.getOrder());
    }

    @Transactional
    public void failed(Runner runner, String code) {
        var state = lockOperation(runner.orderId(), runner.userId(), runner.operationId());
        audit(state.operation(), "ERROR", Map.of("code", code));
        if (state.operation().getRunnerEpoch() != runner.epoch()
                || state.operation().getStatus() != PaymentMethodTransition.Status.VERIFYING) return;
        if (!Objects.equals(state.operation().getReason(), code)) CheckoutRevision.touch(state.order());
        state.operation().setReason(code);
        state.operation().setLeaseUntil(null);
        state.operation().setUpdatedAt(LocalDateTime.now());
    }

    @Transactional
    public Outcome reply(Long id, Long owner, boolean replay) {
        return outcome(lockOwned(id, owner), replay);
    }

    @Transactional
    public Outcome reply(Runner runner, boolean replay) {
        return outcome(lockOperation(runner.orderId(), runner.userId(), runner.operationId()), replay);
    }

    @Transactional
    public Outcome activatePayos(Runner runner, PayOSPaymentClient.Query proof) {
        var state = lockOperation(runner.orderId(), runner.userId(), runner.operationId());
        var op = state.operation();
        if (proof != null) {
            audit(op, "REVERSE_QUERY", proof);
            settlement.query(op.getPaymentAttempt().getId(), proof);
        }
        if (!continueOperation(state) || op.getRunnerEpoch() != runner.epoch()) return outcome(state, true);
        if (!"COD".equals(state.order().getPaymentMethod()) || state.order().getCashCollectedAt() != null) {
            reject(op, "ORDER_NOT_ELIGIBLE", false); return outcome(state, false);
        }
        if (op.getPaymentAttempt() != null && !guard.safeTerminal(op, proof)) return outcome(state, false);
        validateReservation(state.order());
        applyPayos(state);
        return outcome(state, false);
    }

    private void applyPayos(Locked state) {
        var order = state.order();
        var op = state.operation();
        order.setPaymentMethod("PAYOS_VIETQR");
        order.setPayosOrderCode(java.util.concurrent.ThreadLocalRandom.current().nextLong(1_000_000_000_000L, 9_000_000_000_000L));
        order.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        op.setStatus(PaymentMethodTransition.Status.APPLIED);
        op.setReason(null);
        op.setAppliedAt(LocalDateTime.now());
        op.setFinishedAt(op.getAppliedAt());
        op.setUpdatedAt(op.getAppliedAt());
        op.setLeaseUntil(null);
        CheckoutRevision.touch(order);
        op.setResult(serialize(Map.of("orderId", order.getId(), "targetPaymentMethod", "PAYOS_VIETQR",
                "orderCode", order.getPayosOrderCode(), "appliedStateVersion", order.getCheckoutRevision())));
    }

    private Outcome outcome(Locked state, boolean replay) {
        var op = state.operation();
        var current = "PAYOS_VIETQR".equals(state.order().getPaymentMethod())
                ? attempts.findByOrderCode(state.order().getPayosOrderCode()).orElse(null) : state.attempt();
        var body = new PaymentTransitionResponse(operation(op), orderService.snapshot(state.order()),
                payment(current), state.order().getCheckoutRevision(), replay);
        return switch (op.getStatus()) {
            case APPLIED -> new Outcome(200, null, body);
            case VERIFYING -> new Outcome(202, null, body);
            case REJECTED -> new Outcome(409, op.getReason(), body);
            case NEEDS_REVIEW -> new Outcome(409, "PAYMENT_REQUIRES_REVIEW", body);
        };
    }

    @Transactional
    public Runner delivery(Long id) {
        validateId(id);
        var state = lock(id);
        var op = state.operation();
        if (op == null || op.getStatus() != PaymentMethodTransition.Status.APPLIED
                || !"COD".equals(state.order().getPaymentMethod())) return null;
        return new Runner(id, state.order().getUser().getId(), op.getRunnerEpoch(), op.getProviderOrderCode(), false);
    }

    @Transactional(readOnly = true)
    public List<Runner> retiredHistory(Long id) {
        var order = orders.findById(id).orElseThrow(this::missing);
        return attempts.findByOrderIdOrderByIdAsc(id).stream()
                .filter(a -> !Objects.equals(a.getOrderCode(), order.getPayosOrderCode()))
                .map(a -> new Runner(id, order.getUser().getId(), 0, a.getOrderCode(), false)).toList();
    }

    @Transactional
    public boolean verifyRetired(Runner runner, PayOSPaymentClient.Query proof) {
        var state = lockOwned(runner.orderId(), runner.userId());
        var attempt = attempts.findByOrderCode(runner.code()).orElseThrow(this::missing);
        if (!attempt.getOrder().getId().equals(runner.orderId())) throw PaymentTransitionGuard.reviewRequired();
        settlement.query(attempt.getId(), proof);
        if (proof == null || !Objects.equals(attempt.getPaymentLinkId(), proof.paymentLinkId())
                || !Objects.equals(attempt.getOrderCode(), proof.orderCode()) || attempt.getAmount().compareTo(proof.amount()) != 0
                || !Set.of("CANCELLED", "EXPIRED").contains(proof.status()) || !policy.zero(proof)) return false;
        return !guard.hasMoney(attempt) && !guard.needsReview(attempt);
    }

    @Transactional
    public boolean deliveryProof(Runner runner, PayOSPaymentClient.Query proof) {
        var state = lockOwned(runner.orderId(), runner.userId());
        audit(state.operation(), "DELIVERY_QUERY", proof);
        if (proof == null) return false;
        settlement.query(state.attempt().getId(), proof);
        if (!policy.zero(proof) && !guard.hasMoney(state.attempt()) && !guard.needsReview(state.attempt())) {
            settlement.requireReview(state.attempt().getId(), "LATE_PAYMENT_AFTER_METHOD_CHANGE");
        }
        return guard.safeTerminal(state.operation(), proof) && !guard.hasMoney(state.attempt())
                && !guard.needsReview(state.attempt());
    }

    private Locked lockOwned(Long id, Long owner) {
        validateId(id);
        Order order = orders.findByIdForUpdate(id).orElseThrow(this::missing);
        authorize(order, owner);
        return refresh(order);
    }

    private Locked lock(Long id) {
        return refresh(orders.findByIdForUpdate(id).orElseThrow(this::missing));
    }

    private Locked refresh(Order order) {
        em.refresh(order, LockModeType.PESSIMISTIC_WRITE);
        PaymentAttempt attempt = "PAYOS_VIETQR".equals(order.getPaymentMethod())
                ? attempts.findByOrderCode(order.getPayosOrderCode()).orElse(null) : attempts.findByOrderId(order.getId()).orElse(null);
        if (attempt != null) {
            attempt = attempts.findByIdForUpdate(attempt.getId()).orElseThrow();
            em.refresh(attempt, LockModeType.PESSIMISTIC_WRITE);
        }
        var op = transitions.findByOrderIdForUpdate(order.getId()).orElse(null);
        return new Locked(order, attempt, op);
    }

    private void validateReservation(Order order) {
        if (order.getItems().isEmpty()) throw error("ORDER_NOT_ELIGIBLE");
        var quantities = new TreeMap<Long, Integer>();
        order.getItems().forEach(i -> quantities.merge(i.getProduct().getId(), i.getQuantity(), Math::addExact));
        quantities.forEach((id, quantity) -> {
            var product = products.findByIdForUpdate(id).orElseThrow(this::missing);
            em.refresh(product, LockModeType.PESSIMISTIC_WRITE);
            if (quantity <= 0 || product.getReservedStock() < quantity) throw error("ORDER_NOT_ELIGIBLE");
        });
        lockVoucher(order);
    }

    private void lockVoucher(Order order) {
        if (order.getVoucherCode() == null || order.getVoucherCode().isBlank()) return;
        var voucher = vouchers.findByCodeForUpdate(order.getVoucherCode()).orElseThrow(() -> error("ORDER_NOT_ELIGIBLE"));
        em.refresh(voucher, LockModeType.PESSIMISTIC_WRITE);
        if (voucher.getUsedCount() <= 0) throw error("ORDER_NOT_ELIGIBLE");
    }

    private void audit(PaymentMethodTransition op, String source, Object proof) {
        String facts = serialize(proof);
        String hash = PaymentLedgerService.hash(source + ":" + facts);
        if (hash.equals(op.getLastEvidenceHash())) return;
        op.setEvidenceHistory(op.getEvidenceHistory() + serialize(Map.of(
                "source", source, "verifiedAt", offset(LocalDateTime.now()), "fingerprint", hash, "facts", facts)) + "\n");
        op.setLastEvidenceHash(hash);
        op.setUpdatedAt(LocalDateTime.now());
    }

    private OperationContext operation(PaymentMethodTransition op) {
        if (op == null) return null;
        long retry = op.getLeaseUntil() == null ? 0 : Math.max(0, Duration.between(LocalDateTime.now(), op.getLeaseUntil()).toSeconds());
        return new OperationContext(op.getOperationId(), op.getOrder().getId(), op.getOrder().getId(),
                op.getSourceMethod(), op.getTargetMethod(), op.getStatus(), op.getReason(), op.getIdempotencyKey(),
                op.getExpectedStateVersion(), offset(op.getAppliedAt()), retry);
    }

    private PaymentAttemptResponse payment(PaymentAttempt attempt) {
        return attempt == null ? null : PaymentAttemptResponse.from(attempt);
    }

    private String serialize(Object value) {
        try { return json.writeValueAsString(value); }
        catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalStateException(ex); }
    }

    private String offset(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toOffsetDateTime().toString();
    }

    private void authorize(Order order, Long owner) {
        if (owner == null) throw new PaymentLinkException(401, "UNAUTHENTICATED", "Cần đăng nhập");
        if (!order.getUser().getId().equals(owner)) throw new PaymentLinkException(403, "NOT_ORDER_OWNER", "Không có quyền truy cập đơn");
    }

    private void validateId(Long id) {
        if (id == null || id <= 0 || id > 9007199254740991L) {
            throw new PaymentLinkException(400, "INVALID_ORDER_ID", "Mã đơn không hợp lệ");
        }
    }

    private PaymentLinkException missing() {
        return new PaymentLinkException(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn");
    }

    private PaymentLinkException error(String code) {
        return new PaymentLinkException(409, code, "Chưa thể chuyển phương thức của đơn");
    }
}

