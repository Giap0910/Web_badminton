package com.sports.service;

import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class LoyaltyPolicyTest {
    private Order order(long id, OrderStatus status, int points) {
        return Order.builder().id(id).status(status).totalAmount(BigDecimal.valueOf(1030000))
                .shippingFee(BigDecimal.valueOf(30000)).pointsUsed(points).build();
    }
    @Test void pointsComeFromConfirmedMerchandisePaymentAndPendingUsageReservesThem() {
        var paid=order(1,OrderStatus.COMPLETED,0);var pending=order(2,OrderStatus.PENDING,20);
        assertEquals(80,LoyaltyPolicy.available(List.of(paid,pending),Set.of(1L)));
        assertEquals(0,LoyaltyPolicy.available(List.of(pending),Set.of()));
        pending.setStatus(OrderStatus.CANCELLED);
        assertEquals(100,LoyaltyPolicy.available(List.of(paid,pending),Set.of(1L)));
    }
    @Test void redemptionUsesOneHundredDongAndMaximumTenPercentAfterVoucher() {
        assertEquals(BigDecimal.valueOf(10000),LoyaltyPolicy.discount(100,100,BigDecimal.valueOf(100000)));
        assertThrows(BadRequestException.class,()->LoyaltyPolicy.discount(101,200,BigDecimal.valueOf(100000)));
        assertThrows(BadRequestException.class,()->LoyaltyPolicy.discount(100,99,BigDecimal.valueOf(100000)));
        assertThrows(BadRequestException.class,()->LoyaltyPolicy.discount(-1,100,BigDecimal.valueOf(100000)));
    }
}
