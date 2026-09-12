package com.sports.service;

import com.sports.dto.DashboardStatsResponse;
import com.sports.dto.OrderResponse;
import com.sports.entity.Order;
import com.sports.entity.OrderStatus;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long totalOrders = orderRepository.count();
        long totalCustomers = userRepository.count();
        long totalProducts = productRepository.count();
        long pendingOrders = orderRepository.countByStatus(OrderStatus.PENDING);
        long paidOrders = orderRepository.countByStatus(OrderStatus.PAID);

        List<Order> paidOrderList = orderRepository.findByStatus(OrderStatus.PAID);
        BigDecimal totalRevenue = paidOrderList.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 5 Recent Orders
        List<OrderResponse> recentOrders = orderRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(order -> orderService.getOrderById(order.getId(), order.getUser().getId(), true))
                .collect(Collectors.toList());

        // Daily revenue for last 7 days
        Map<String, BigDecimal> dailyRevenue = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        LocalDate today = LocalDate.now();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateKey = date.format(formatter);
            dailyRevenue.put(dateKey, BigDecimal.ZERO);
        }

        for (Order order : paidOrderList) {
            if (order.getCreatedAt() != null) {
                LocalDate orderDate = order.getCreatedAt().toLocalDate();
                if (!orderDate.isBefore(today.minusDays(6))) {
                    String dateKey = orderDate.format(formatter);
                    BigDecimal current = dailyRevenue.getOrDefault(dateKey, BigDecimal.ZERO);
                    dailyRevenue.put(dateKey, current.add(order.getTotalAmount()));
                }
            }
        }

        return DashboardStatsResponse.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .totalCustomers(totalCustomers)
                .totalProducts(totalProducts)
                .pendingOrders(pendingOrders)
                .paidOrders(paidOrders)
                .recentOrders(recentOrders)
                .dailyRevenue(dailyRevenue)
                .build();
    }
}
