package com.sports.service;

import com.sports.dto.OrderResponse;
import com.sports.entity.OrderStatus;
import com.sports.exception.*;
import com.sports.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class CashCollectionService {
    private final OrderRepository orders;
    private final OrderService orderService;

    @Transactional
    public OrderResponse collect(Long id, Long actorId, BigDecimal amount) {
        var order = orders.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        if (!"COD".equals(order.getPaymentMethod()) || !java.util.Set.of(OrderStatus.SHIPPING, OrderStatus.COMPLETED).contains(order.getStatus())) {
            throw new BadRequestException("Chỉ xác nhận thu tiền cho đơn COD đang giao hoặc đã giao");
        }
        if (amount == null || amount.compareTo(order.getTotalAmount()) != 0) throw new BadRequestException("Số tiền thu phải khớp tổng tiền đơn hàng");
        if (order.getCashCollectedAt() == null) {
            order.setCashCollectedAt(LocalDateTime.now().withNano(0)); order.setCashCollectedBy(actorId);
            CheckoutRevision.touch(order); orders.save(order);
        }
        return orderService.snapshot(order);
    }
}
