package com.sports.service;

import com.sports.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockSchedulerService {
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @Scheduled(fixedRate = 60000)
    public void releaseExpiredStockReservations() {
        for (Long orderId : orderRepository.findExpiredPaymentOrderIds(LocalDateTime.now())) {
            try {
                if (orderService.expireOrder(orderId)) {
                    log.info("Đã hủy đơn hết hạn và hoàn kho ID={}", orderId);
                }
            } catch (Exception e) {
                log.error("Không thể xử lý đơn hết hạn ID={}; giao dịch đã hoàn tác", orderId, e);
            }
        }
    }
}
