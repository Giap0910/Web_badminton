package com.sports.service;
import com.sports.entity.*;
import com.sports.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class UserServiceStorefrontTest {
    final UserRepository users = mock(UserRepository.class);
    final OrderRepository orders = mock(OrderRepository.class);
    final UserService service = new UserService(users, mock(PasswordEncoder.class), orders);
    User user = User.builder().id(9L).username("test").role(Role.ROLE_USER).build();
    Order order(long id, String amount, String shipping, OrderStatus status) {
        return Order.builder().id(id).user(user).totalAmount(new BigDecimal(amount))
                .shippingFee(new BigDecimal(shipping)).status(status).build();
    }
    @Test void noOrdersMeansZeroOrdersAndZeroPoints() {
        when(users.findById(9L)).thenReturn(Optional.of(user));
        when(orders.findByUserIdOrderByCreatedAtDesc(9L)).thenReturn(List.of());
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        var profile = service.getUserProfile(9L);
        assertEquals(0, profile.getTotalOrders());
        assertEquals(0L, profile.getLoyaltyPoints());
    }
    @Test void pointsUseAggregatePaidMoneyAndExcludeShippingUnpaidAndCancelled() {
        when(users.findById(9L)).thenReturn(Optional.of(user));
        var first = order(1, "36000", "30000", OrderStatus.PAID);
        var second = order(2, "6000", "0", OrderStatus.COMPLETED);
        var unpaid = order(3, "1000000", "0", OrderStatus.PENDING);
        var cancelled = order(4, "5000000", "0", OrderStatus.CANCELLED);
        when(orders.findByUserIdOrderByCreatedAtDesc(9L)).thenReturn(List.of(first, second, unpaid, cancelled));
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of(first, second, cancelled));
        var profile = service.getUserProfile(9L);
        assertEquals(4, profile.getTotalOrders());
        assertEquals(new BigDecimal("12000"), profile.getPaidProductAmount());
        assertEquals(1L, profile.getLoyaltyPoints());
    }
    @Test void oneUnpaidOrderDoesNotEarnPoints() {
        when(users.findById(9L)).thenReturn(Optional.of(user));
        when(orders.findByUserIdOrderByCreatedAtDesc(9L)).thenReturn(List.of(order(1, "9000000", "0", OrderStatus.PENDING)));
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        var profile = service.getUserProfile(9L);
        assertEquals(1, profile.getTotalOrders());
        assertEquals(0L, profile.getLoyaltyPoints());
    }
}
