package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;

import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.dto.OrderResponse;
import com.sports.dto.VoucherValidateResponse;
import com.sports.entity.Order;
import com.sports.entity.OrderStatus;
import com.sports.entity.Product;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.InsufficientStockException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import com.sports.service.OrderService;
import com.sports.service.PayOSService;
import com.sports.service.VoucherService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

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

    @FuzzTest
    public void fuzzOrderStructure(FuzzedDataProvider data) {
        checkInvalidStructure(data.consumeInt(0, 6));
    }

    @FuzzTest
    public void fuzzRepeatedProductLines(FuzzedDataProvider data) {
        int[] quantities = IntStream.range(0, data.consumeInt(1, 20))
                .map(index -> data.consumeInt(1, 100)).toArray();
        checkAggregate(quantities);
    }

    @FuzzTest
    public void fuzzOrderPolicies(FuzzedDataProvider data) {
        checkPolicy(data.consumeInt(0, 4), data.consumeInt(0, 5));
    }

    @FuzzTest
    public void fuzzReservationArithmetic(FuzzedDataProvider data) {
        checkReservation(Integer.MAX_VALUE - data.consumeInt(0, 100), data.consumeInt(1, 100));
    }

    @ParameterizedTest(name = "DH-03: cấu trúc đầu vào {0}")
    @ValueSource(ints = {0, 1, 2, 3, 4, 5, 6})
    void invalidStructuresAreRejected(int scenario) {
        checkInvalidStructure(scenario);
    }

    @Test
    void aggregateQuantityBoundaries() {
        checkAggregate(new int[]{60, 40});
        checkAggregate(new int[]{60, 41});
        checkAggregate(IntStream.range(0, 20).map(index -> 5).toArray());
    }

    @ParameterizedTest(name = "DH-08: phương thức {0}")
    @ValueSource(ints = {0, 1, 2, 3, 4, 5})
    void pendingOrderAndPaymentMethodBoundaries(int methodIndex) {
        checkPolicy(2, methodIndex);
        checkPolicy(3, methodIndex);
    }

    @ParameterizedTest(name = "DH-09: kho giữ chỗ ban đầu {0}")
    @ValueSource(ints = {0, 2147483646, 2147483647})
    void reservationMustNotOverflow(int reserved) {
        checkReservation(reserved, 1);
    }

    @ParameterizedTest(name = "DH-09: cộng 100 vào kho giữ chỗ {0}")
    @ValueSource(ints = {2147483547, 2147483548, 2147483647})
    void maximumQuantityReservationBoundaries(int reserved) {
        checkReservation(reserved, 100);
    }

    @Test
    void payosCodeOverflowIsReported() {
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 10);
        fixture.savedId = Long.MAX_VALUE;
        assertThrows(ArithmeticException.class,
                () -> fixture.service.createOrder(1L, request(1, "PAYOS_VIETQR"), java.util.UUID.randomUUID().toString()).order());
    }

    @Test
    void voucherDiscountAndRejection() {
        OrderFixture fixture = new OrderFixture(new BigDecimal("1000000"), 10);
        OrderCreateRequest request = request(1, "COD");
        request.setVoucherCode(" SALE ");
        when(fixture.vouchers.reserveVoucher(any())).thenReturn(VoucherValidateResponse.builder()
                .code("SALE").valid(true).discountAmount(new BigDecimal("100000")).build());
        OrderResponse response = fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
        assertEquals(0, new BigDecimal("900000").compareTo(response.getTotalAmount()));
        assertEquals(0, response.getShippingFee().signum());
        assertEquals("SALE", response.getVoucherCode());
        OrderFixture rejected = new OrderFixture(BigDecimal.TEN, 10);
        when(rejected.vouchers.reserveVoucher(any())).thenThrow(new BadRequestException("Mã hết hạn"));
        assertThrows(BadRequestException.class, () -> rejected.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        verify(rejected.orders, never()).saveAndFlush(any());
    }

    @Test
    void defaultPayosOrderExpiresExactlyFifteenMinutesAfterCreation() {
        BigDecimal price = new BigDecimal("100000");
        OrderFixture fixture = new OrderFixture(price, 10);

        OrderResponse response = fixture.service.createOrder(1L, request(2, "PAYOS_VIETQR"), java.util.UUID.randomUUID().toString()).order();

        assertCreated(response, fixture, 2, price, 10, "PAYOS_VIETQR");
        assertNotNull(response.getCreatedAt());
        assertEquals(response.getCreatedAt().plusMinutes(15), response.getExpiresAt());
        assertEquals(0, new BigDecimal("230000").compareTo(response.getTotalAmount()));
        verifyNoInteractions(fixture.payments, fixture.vouchers);
    }

    @Test
    void blankVoucherDoesNotCallVoucherService() {
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 10);
        OrderCreateRequest request = request(1, "COD");
        request.setVoucherCode(" \t ");

        OrderResponse response = fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();

        assertCreated(response, fixture, 1, BigDecimal.TEN, 10, "COD");
        assertNull(response.getVoucherCode());
        assertEquals(0, response.getDiscountAmount().signum());
        verifyNoInteractions(fixture.vouchers);
    }

    @Test
    void failedOrderDoesNotLeakIntoNextIteration() {
        OrderFixture failed = new OrderFixture(BigDecimal.TEN, 10);
        OrderCreateRequest rejectedRequest = request(2, "COD");
        rejectedRequest.setVoucherCode("EXPIRED");
        failed.savedId = Long.MAX_VALUE;
        when(failed.vouchers.reserveVoucher(any())).thenThrow(new BadRequestException("Mã hết hạn"));
        assertThrows(BadRequestException.class, () -> failed.service.createOrder(1L, rejectedRequest, java.util.UUID.randomUUID().toString()).order());

        OrderFixture next = new OrderFixture(BigDecimal.TEN, 10);
        next.assertUnchanged(10);
        verifyNoInteractions(next.orders, next.products, next.users, next.vouchers, next.payments);
        OrderResponse response = next.service.createOrder(1L, request(2, "PAYOS_VIETQR"), java.util.UUID.randomUUID().toString()).order();

        assertCreated(response, next, 2, BigDecimal.TEN, 10, "PAYOS_VIETQR");
        verify(failed.orders, never()).saveAndFlush(any());
        verifyNoInteractions(next.vouchers, failed.payments, next.payments);
    }

    @Test
    void successfulOrdersUseIndependentStockAndMocks() {
        OrderFixture first = new OrderFixture(BigDecimal.TEN, 10);
        first.service.createOrder(1L, request(2, "COD"), java.util.UUID.randomUUID().toString()).order();
        OrderFixture next = new OrderFixture(BigDecimal.TEN, 10);

        OrderResponse response = next.service.createOrder(1L, request(2, "COD"), java.util.UUID.randomUUID().toString()).order();

        assertCreated(response, next, 2, BigDecimal.TEN, 10, "COD");
        assertEquals(8, first.product.getStock());
        assertEquals(2, first.product.getReservedStock());
        verify(first.products, times(1)).save(first.product);
        verifyNoInteractions(first.payments, next.payments);
    }

    private void checkInvalidStructure(int scenario) {
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 10);
        OrderCreateRequest request = request(1, "COD");
        switch (scenario) {
            case 0 -> request.setItems(null);
            case 1 -> request.setItems(List.of());
            case 2 -> request.setItems(java.util.Collections.singletonList(null));
            case 3 -> request.setItems(List.of(new OrderItemRequest(null, 1)));
            case 4 -> request.setItems(List.of(new OrderItemRequest(10L, null)));
            case 5 -> request.setItems(List.of(new OrderItemRequest(999L, 1)));
            case 6 -> when(fixture.users.findByIdForUpdate(1L)).thenReturn(Optional.empty());
            default -> throw new IllegalArgumentException("Kịch bản không được hỗ trợ");
        }
        Class<? extends RuntimeException> expected = scenario >= 5
                ? ResourceNotFoundException.class : BadRequestException.class;
        assertThrows(expected, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
        fixture.assertUnchanged(10);
    }

    private void checkAggregate(int[] quantities) {
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 100);
        OrderCreateRequest request = request(1, "COD");
        request.setItems(IntStream.of(quantities).mapToObj(q -> new OrderItemRequest(10L, q)).toList());
        int total = IntStream.of(quantities).sum();
        if (total > 100) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
            fixture.assertUnchanged(100);
            verifyNoInteractions(fixture.products);
        } else {
            OrderResponse response = fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
            assertEquals(quantities.length, response.getItems().size());
            assertEquals(total, response.getItems().stream().mapToInt(item -> item.getQuantity()).sum());
            assertEquals(100 - total, fixture.product.getStock());
            assertEquals(total, fixture.product.getReservedStock());
            BigDecimal expected = BigDecimal.valueOf(total * 10L + 30000);
            assertEquals(0, expected.compareTo(response.getTotalAmount()));
        }
    }

    private void checkPolicy(int pendingCount, int methodIndex) {
        String[] methods = {null, " ", "PAYOS_VIETQR", "COD", " COD ", "UNKNOWN"};
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 10);
        when(fixture.orders.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(pendingCount);
        OrderCreateRequest request = request(1, methods[methodIndex]);
        if (pendingCount >= 3 || methodIndex == 5) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
            fixture.assertUnchanged(10);
        } else {
            OrderResponse response = fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
            String expected = methodIndex == 3 || methodIndex == 4 ? "COD" : "PAYOS_VIETQR";
            assertCreated(response, fixture, 1, BigDecimal.TEN, 10, expected);
        }
    }

    private void checkReservation(int reserved, int quantity) {
        OrderFixture fixture = new OrderFixture(BigDecimal.TEN, 100);
        fixture.product.setReservedStock(reserved);
        long expected = (long) reserved + quantity;
        try {
            fixture.service.createOrder(1L, request(quantity, "COD"), java.util.UUID.randomUUID().toString()).order();
        } catch (ArithmeticException | BadRequestException exception) {
            assertTrue(expected > Integer.MAX_VALUE, "Không được từ chối phép cộng trong miền hợp lệ");
            assertEquals(reserved, fixture.product.getReservedStock());
            assertEquals(100, fixture.product.getStock());
            verify(fixture.products, never()).save(any());
            verify(fixture.orders, never()).saveAndFlush(any());
            return;
        }
        assertEquals(expected, fixture.product.getReservedStock().longValue(),
                "DH-09: kho giữ chỗ bị tràn số khi cộng số lượng mua");
        assertEquals(100 - quantity, fixture.product.getStock());
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
        checkOrder(3, BigDecimal.TEN, 4, "PAYOS_VIETQR");
    }

    private void checkOrder(int quantity, BigDecimal price, int stock, String method) {
        OrderFixture fixture = new OrderFixture(price, stock);
        OrderCreateRequest request = request(quantity, method);
        if (quantity <= 0 || quantity > 100) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
            fixture.assertUnchanged(stock);
        } else if (stock < quantity) {
            assertThrows(InsufficientStockException.class, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
            fixture.assertUnchanged(stock);
        } else if (price == null || price.signum() <= 0 || price.stripTrailingZeros().scale() > 0
                || price.multiply(BigDecimal.valueOf(quantity)).compareTo(new BigDecimal("9999999999")) > 0) {
            assertThrows(BadRequestException.class, () -> fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());
            fixture.assertUnchanged(stock);
        } else {
            OrderResponse response = fixture.service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();
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
        request.setShippingFee(new BigDecimal("999999"));
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
        verify(fixture.orders).saveAndFlush(any(Order.class));
    }

    private static class OrderFixture {
        private final OrderRepository orders = mock(OrderRepository.class);
        private final ProductRepository products = mock(ProductRepository.class);
        private final UserRepository users = mock(UserRepository.class);
        private final VoucherService vouchers = mock(VoucherService.class);
        private final PayOSService payments = mock(PayOSService.class, invocation -> {
            throw new AssertionError("Test đặt hàng không được gọi dịch vụ thanh toán: "
                    + invocation.getMethod().getName());
        });
        private final Product product;
        private final OrderService service;
        private long savedId = 99L;

        private OrderFixture(BigDecimal price, int stock) {
            product = Product.builder().id(10L).name("Vợt kiểm thử")
                    .price(price).stock(stock).reservedStock(0).build();
            when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(User.builder().id(1L).build()));
            when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
            when(orders.saveAndFlush(any(Order.class))).thenAnswer(invocation -> {
                Order order = invocation.getArgument(0);
                order.setId(savedId);
                return order;
            });
            service = new OrderService(orders, products, users, payments,
                    vouchers, mock(EntityManager.class));
        }

        private void assertUnchanged(int stock) {
            assertEquals(stock, product.getStock());
            assertEquals(0, product.getReservedStock());
            verify(products, never()).save(any());
            verify(orders, never()).saveAndFlush(any());
        }
    }
}
