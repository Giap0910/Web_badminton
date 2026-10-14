package com.sports.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private BigDecimal totalRevenue;
    private Long totalOrders;
    private Long totalCustomers;
    private Long totalProducts;
    private Long pendingOrders;
    private Long paidOrders;
    private List<OrderResponse> recentOrders;
    private Map<String, BigDecimal> dailyRevenue;
    private Long unverifiedPaidOrders;
    private String revenueBasis;
    private List<TopSellingProduct> topSellingProducts;
    public record TopSellingProduct(Long productId, String productSku, String productName, Long quantity,
            BigDecimal grossMerchandiseAmount, Boolean productDeleted) {}
}
