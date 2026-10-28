package com.sports.service;

import com.sports.repository.PaymentEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class AdminPaymentLogService {
    private final PaymentEventRepository events;
    @Transactional(readOnly = true)
    public List<Map<String, Object>> recent() {
        return events.findAll(PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "id"))).stream().map(event -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", event.getId()); row.put("orderCode", event.getOrderCode()); row.put("amount", event.getAmount());
            row.put("receivedAt", event.getReceivedAt()); row.put("verifiedAt", event.getVerifiedAt());
            row.put("source", event.getSource()); row.put("processingResult", event.getProcessingResult());
            row.put("reviewReason", event.getReviewReason()); return row;
        }).toList();
    }
}
