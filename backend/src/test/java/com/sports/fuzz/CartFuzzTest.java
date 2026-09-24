package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;

import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.dto.OrderResponse;
import com.sports.entity.Order;
import com.sports.entity.Product;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.InsufficientStockException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import com.sports.service.OrderService;
import com.sports.service.PayOSService;
import com.sports.service.VoucherService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class CartFuzzTest {

    @FuzzTest
    public void fuzzCartCalculation(FuzzedDataProvider data) {
        boolean validInput = data.consumeBoolean();
        int quantity = validInput ? data.consumeInt(1, 100) : data.consumeInt();
        long price = validInput ? data.consumeLong(1, Long.MAX_VALUE) : data.consumeLong();
        int stock = validInput ? data.consumeInt(quantity, Integer.MAX_VALUE) : data.consumeInt(0, 200);
        checkOrder(quantity, BigDecimal.valueOf(price, data.consumeInt(0, 2)), stock,
                data.consumeBoolean() ? "COD" : "PAYOS_VIETQR");
    }

    @Test
    void orderBoundariesExerciseRealService() {
        for (int quantity : new int[]{Integer.MIN_VALUE, -1, 0, 1, 99, 100, 101, Integer.MAX_VALUE}) {
            checkOrder(quantity, new BigDecimal("100000"), 100, "PAYOS_VIETQR");
        }
        for (BigDecimal price : new BigDecimal[]{null, BigDecimal.ZERO, BigDecimal.ONE.negate(),
                new BigDecimal("999999"), new BigDecimal("1000000"), new BigDecimal("1000001"),
                new BigDecimal("100.25"), BigDecimal.valueOf(Long.MAX_VALUE)}) {
            checkOrder(1, price, 10, "COD");
        }
        checkOrder(3, BigDecimal.TEN, 2, "PAYOS_VIETQR");
        checkOrder(3, BigDecimal.TEN, 3, "PAYOS_VIETQR");
    }

    private void checkOrder(int quantity, BigDecimal price, int stock, String method) {
        OrderFixture fixture = new OrderFixture(price, stock);
        OrderCreateRequest request = request(quantity, method);
        if (quantity <= 0 || quantity > 100) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request));
            fixture.assertUnchanged(stock);
        } else if (stock < quantity) {
            assertThrows(InsufficientStockException.class, () -> fixture.service.createOrder(1L, request));
            fixture.assertUnchanged(stock);
        } else if (price == null || price.signum() <= 0) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request));
            fixture.assertUnchanged(stock);
        } else {
            OrderResponse response = fixture.service.createOrder(1L, request);
            assertCreated(response, fixture, quantity, price, stock, method);
        }
    }

    private OrderCreateRequest request(int quantity, String method) {
        OrderCreateRequest request = new OrderCreateRequest();
        request.setItems(List.of(new OrderItemRequest(10L, quantity)));
        request.setPaymentMethod(method);
        request.setCustomerName("Khách kiểm thử");
        request.setShippingPhone("0900000000");
        request.setShippingAddress("Địa chỉ kiểm thử");
        request.setShippingFee(new BigDecimal("-999999"));
        return request;
    }

    private void assertCreated(OrderResponse response, OrderFixture fixture, int quantity,
                               BigDecimal price, int stock, String method) {
        BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));
        BigDecimal shipping = subtotal.compareTo(new BigDecimal("1000000")) < 0
                ? new BigDecimal("30000") : BigDecimal.ZERO;
        assertEquals(0, subtotal.add(shipping).compareTo(response.getTotalAmount()));
        assertEquals(0, shipping.compareTo(response.getShippingFee()));
        assertEquals(quantity, response.getItems().get(0).getQuantity());
        assertEquals(stock - quantity, fixture.product.getStock());
        assertEquals(quantity, fixture.product.getReservedStock());
        assertEquals("PENDING", response.getStatus());
        assertEquals(method, response.getPaymentMethod());
        if ("COD".equals(method)) {
            assertNull(response.getExpiresAt());
            assertNull(response.getPayosOrderCode());
        } else {
            assertNotNull(response.getExpiresAt());
            assertEquals(1_000_000_099L, response.getPayosOrderCode());
        }
        verify(fixture.products).save(fixture.product);
        verify(fixture.orders).save(any(Order.class));
    }

    private static class OrderFixture {
        private final OrderRepository orders = mock(OrderRepository.class);
        private final ProductRepository products = mock(ProductRepository.class);
        private final UserRepository users = mock(UserRepository.class);
        private final Product product;
        private final OrderService service;

        private OrderFixture(BigDecimal price, int stock) {
            product = Product.builder().id(10L).name("Vợt kiểm thử")
                    .price(price).stock(stock).reservedStock(0).build();
            when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(User.builder().id(1L).build()));
            when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
            when(orders.save(any(Order.class))).thenAnswer(invocation -> {
                Order order = invocation.getArgument(0);
                order.setId(99L);
                return order;
            });
            service = new OrderService(orders, products, users, new PayOSService(),
                    mock(VoucherService.class), mock(EntityManager.class));
        }

        private void assertUnchanged(int stock) {
            assertEquals(stock, product.getStock());
            assertEquals(0, product.getReservedStock());
            verify(products, never()).save(any());
            verify(orders, never()).save(any());
        }
    }
}
