package com.sports.service;

import com.sports.entity.Order;
import com.sports.entity.OrderItem;
import com.sports.entity.OrderStatus;
import com.sports.entity.Product;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockSchedulerService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    /**
     * Periodically runs every 60 seconds to scan for PENDING orders that exceeded their 15-minute expiration window.
     * Automatically unlocks reserved_stock back to available stock and sets order status to CANCELLED.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void releaseExpiredStockReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<Order> expiredOrders = orderRepository.findByStatusAndExpiresAtBefore(OrderStatus.PENDING, now);

        if (expiredOrders.isEmpty()) {
            return;
        }

        log.info("[STOCK CLEANER] Phát hiện {} đơn hàng PENDING đã quá hạn 15 phút. Bắt đầu giải phóng kho...", expiredOrders.size());

        for (Order order : expiredOrders) {
            try {
                for (OrderItem item : order.getItems()) {
                    Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                            .orElse(item.getProduct());

                    product.setStock(product.getStock() + item.getQuantity());
                    product.setReservedStock(Math.max(0, product.getReservedStock() - item.getQuantity()));
                    productRepository.save(product);

                    log.info(" - Hoàn trả {} chiếc cho sản phẩm '{}' (ID: {})",
                            item.getQuantity(), product.getName(), product.getId());
                }

                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.save(order);
                log.info("[STOCK CLEANER] Đã hủy đơn ID={} (PayOS Code={}) và hoàn kho thành công.",
                        order.getId(), order.getPayosOrderCode());
            } catch (Exception e) {
                log.error("[STOCK CLEANER] Lỗi khi hoàn kho cho đơn hàng ID={}: {}", order.getId(), e.getMessage());
            }
        }
    }
}
