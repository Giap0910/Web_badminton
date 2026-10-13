package com.sports.service;

import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import java.math.BigDecimal;
import java.util.*;

public final class LoyaltyPolicy {
    private LoyaltyPolicy() {}
    public static long available(List<Order> orders, Set<Long> recognizedPayments) {
        BigDecimal paid = orders.stream().filter(o -> recognizedPayments.contains(o.getId()) && o.getStatus() != OrderStatus.CANCELLED)
                .map(o -> o.getTotalAmount().subtract(o.getShippingFee() == null ? BigDecimal.ZERO : o.getShippingFee()).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long earned = paid.divideToIntegralValue(BigDecimal.valueOf(10000)).longValueExact();
        long heldOrUsed = orders.stream().filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .mapToLong(o -> o.getPointsUsed() == null ? 0 : o.getPointsUsed()).sum();
        return Math.max(0,earned-heldOrUsed);
    }
    public static BigDecimal discount(int points, long available, BigDecimal merchandise) {
        long maximum = merchandise.divideToIntegralValue(BigDecimal.valueOf(1000)).longValueExact();
        if (points < 0 || points > available || points > maximum) throw new BadRequestException("Số điểm vượt số dư hoặc giới hạn 10% tiền hàng sau voucher");
        return BigDecimal.valueOf(points).multiply(BigDecimal.valueOf(100));
    }
}
