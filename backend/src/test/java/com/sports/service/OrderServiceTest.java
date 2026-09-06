package com.sports.service;

import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.dto.OrderResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.InsufficientStockException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PayOSService payosService;

    @InjectMocks
    private OrderService orderService;

    private User mockUser;
    private Product mockProduct;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(1L)
                .username("testuser")
                .role(Role.ROLE_USER)
                .build();

        mockProduct = Product.builder()
                .id(10L)
                .name("Yonex Astrox 100ZZ")
                .price(new BigDecimal("4250000"))
                .stock(5)
                .reservedStock(0)
                .build();
    }

    @Test
    @DisplayName("Đặt hàng thành công: Chuyển tồn kho từ stock sang reservedStock chuẩn Atomic")
    void testCreateOrder_SuccessfulReservation() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(0);
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(99L);
            return o;
        });

        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName("Nguyen Van A");
        request.setShippingPhone("0987654321");
        request.setShippingAddress("Ha Noi");
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 2)));

        OrderResponse response = orderService.createOrder(1L, request);

        assertNotNull(response);
        assertEquals(99L, response.getId());
        assertEquals(3, mockProduct.getStock()); // 5 - 2 = 3
        assertEquals(2, mockProduct.getReservedStock()); // 0 + 2 = 2
        verify(productRepository).save(mockProduct);
    }

    @Test
    @DisplayName("Đặt hàng thất bại: Kho không đủ số lượng (InsufficientStockException)")
    void testCreateOrder_InsufficientStock() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(0);
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));

        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName("Nguyen Van A");
        request.setShippingPhone("0987654321");
        request.setShippingAddress("Ha Noi");
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 10))); // Muốn mua 10 trong khi kho chỉ có 5

        assertThrows(InsufficientStockException.class, () -> orderService.createOrder(1L, request));
        assertEquals(5, mockProduct.getStock()); // Tồn kho không bị thay đổi
        assertEquals(0, mockProduct.getReservedStock());
    }

    @Test
    @DisplayName("Phòng chống Denial of Inventory: Chặn khi user có từ 3 đơn PENDING trở lên")
    void testCreateOrder_DenialOfInventoryBlocked() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(orderRepository.countByUserIdAndStatus(1L, OrderStatus.PENDING)).thenReturn(3);

        OrderCreateRequest request = new OrderCreateRequest();
        request.setItems(Collections.singletonList(new OrderItemRequest(10L, 1)));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> orderService.createOrder(1L, request));
        assertTrue(ex.getMessage().contains("chưa thanh toán"));
        verify(productRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Khách chủ động hủy đơn: Hoàn trả ngay reserved_stock về stock")
    void testCancelOrder_RestoresStock() {
        mockProduct.setStock(3);
        mockProduct.setReservedStock(2);

        OrderItem orderItem = OrderItem.builder()
                .product(mockProduct)
                .quantity(2)
                .price(mockProduct.getPrice())
                .build();

        Order order = Order.builder()
                .id(99L)
                .user(mockUser)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("8500000"))
                .items(Collections.singletonList(orderItem))
                .build();

        when(orderRepository.findById(99L)).thenReturn(Optional.of(order));
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.cancelOrder(99L, 1L, false);

        assertEquals("CANCELLED", response.getStatus());
        assertEquals(5, mockProduct.getStock()); // 3 + 2 = 5
        assertEquals(0, mockProduct.getReservedStock()); // 2 - 2 = 0
    }
}
