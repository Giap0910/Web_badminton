package com.sports.controller;

import com.sports.dto.AdminPaymentDto;
import com.sports.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminPaymentController {

    private final OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<List<AdminPaymentDto>> getAllPayments() {
        List<AdminPaymentDto> payments = orderRepository.findAll().stream()
                .sorted((o1, o2) -> o2.getCreatedAt().compareTo(o1.getCreatedAt()))
                .map(order -> AdminPaymentDto.builder()
                        .orderId(order.getId())
                        .payosOrderCode(order.getPayosOrderCode())
                        .customerName(order.getCustomerName())
                        .shippingPhone(order.getShippingPhone())
                        .amount(order.getTotalAmount())
                        .paymentMethod(order.getPaymentMethod())
                        .status(order.getStatus())
                        .createdAt(order.getCreatedAt())
                        .note(order.getNote())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(payments);
    }
}
