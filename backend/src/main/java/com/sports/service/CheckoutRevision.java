package com.sports.service;

import com.sports.entity.Order;
import org.springframework.transaction.support.*;
import java.util.HashSet;
import java.util.Set;

public final class CheckoutRevision {
    private CheckoutRevision() {}

    public static void touch(Order order) {
        if (order.getCheckoutRevision() >= 9007199254740991L) throw new IllegalStateException("Phiên bản vượt giới hạn");
        if (!TransactionSynchronizationManager.isSynchronizationActive() || changedOrders().add(order.getId())) {
            order.setCheckoutRevision(order.getCheckoutRevision() + 1);
        }
    }

    @SuppressWarnings("unchecked")
    private static Set<Long> changedOrders() {
        var existing = TransactionSynchronizationManager.getResource(CheckoutRevision.class);
        if (existing != null) return (Set<Long>) existing;
        var ids = new HashSet<Long>();
        TransactionSynchronizationManager.bindResource(CheckoutRevision.class, ids);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                TransactionSynchronizationManager.unbindResourceIfPossible(CheckoutRevision.class);
            }
        });
        return ids;
    }
}
