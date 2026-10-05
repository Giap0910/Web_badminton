package com.sports.service;

import com.sports.dto.*;
import com.sports.entity.PaymentAttempt;
import com.sports.exception.PaymentLinkException;
import com.sports.repository.PaymentAttemptRepository;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class AdminPaymentService {
    private final PaymentAttemptRepository attempts;

    @Transactional(readOnly = true)
    public Object list(Integer page, Integer size, String query, String status, String sortBy, String sortDir) {
        validate(page, size, query, sortBy, sortDir);
        var filter = filter(query, status);
        var direction = "asc".equals(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        var sort = Sort.by(direction, "id".equals(sortBy) ? "id" : "order.createdAt");
        if (page == null && size == null) return attempts.findAll(filter, sort).stream().map(AdminPaymentDto::from).toList();
        var result = attempts.findAll(filter, PageRequest.of(page == null ? 0 : page, size == null ? 20 : size, sort));
        return PageResponse.<AdminPaymentDto>builder().content(result.getContent().stream().map(AdminPaymentDto::from).toList())
                .pageNo(result.getNumber()).pageSize(result.getSize()).totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages()).last(result.isLast()).build();
    }

    private void validate(Integer page, Integer size, String query, String sortBy, String sortDir) {
        if (page != null && page < 0 || size != null && (size < 1 || size > 100) || query == null || query.length() > 200
                || !java.util.Set.of("id", "createdAt").contains(sortBy)
                || !java.util.Set.of("asc", "desc").contains(sortDir)) throw invalid();
    }

    private Specification<PaymentAttempt> filter(String query, String status) {
        var parsed = parseStatus(status);
        return (root, criteria, builder) -> {
            if (criteria.getResultType() == PaymentAttempt.class) root.fetch("order", JoinType.INNER);
            var predicate = builder.conjunction();
            if (parsed != null) predicate = builder.and(predicate, builder.equal(root.get("status"), parsed));
            if (!query.isBlank()) {
                String keyword = "%" + query.toLowerCase(Locale.ROOT) + "%";
                predicate = builder.and(predicate, builder.or(builder.like(builder.lower(root.get("order").get("customerName")), keyword),
                        builder.like(root.get("orderCode").as(String.class), keyword), builder.like(root.get("reference"), keyword)));
            }
            return predicate;
        };
    }

    private PaymentAttempt.Status parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try { return PaymentAttempt.Status.valueOf(status); }
        catch (IllegalArgumentException ex) { throw invalid(); }
    }

    private PaymentLinkException invalid() {
        return new PaymentLinkException(400, "INVALID_PAYMENT_QUERY", "Điều kiện tìm giao dịch không hợp lệ");
    }
}
