package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.controller.OrderController;
import com.sports.controller.AdminVoucherController;
import com.sports.controller.VoucherController;
import com.sports.dto.*;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.GlobalExceptionHandler;
import com.sports.repository.*;
import com.sports.security.CustomUserDetails;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.http.MediaType;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class OrderValidationTest {
    private OrderRepository orders;
    private ProductRepository products;
    private UserRepository users;
    private VoucherRepository vouchers;
    private PayOSService gateway;
    private OrderService service;
    private Product product;
    private User user;
    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setup() {
        orders = mock(OrderRepository.class);
        products = mock(ProductRepository.class);
        users = mock(UserRepository.class);
        vouchers = mock(VoucherRepository.class);
        gateway = mock(PayOSService.class);
        user = User.builder().id(1L).username("validation-test").role(Role.ROLE_USER).build();
        product = Product.builder().id(10L).name("Test").price(new BigDecimal("100000"))
                .stock(200).reservedStock(0).build();
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(products.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
        when(orders.saveAndFlush(any())).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(99L);
            return order;
        });
        service = new OrderService(orders, products, users, gateway,
                new VoucherService(vouchers, orders, products, new MockEnvironment()), mock(EntityManager.class), mock(PaymentTransitionGuard.class));
        mvc = MockMvcBuilders.standaloneSetup(new OrderController(service, mock(OrderStatusService.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(principalResolver()).build();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"-1", "0", "0.5", "100.25", "10000000000", "999999999999999999999"})
    void invalidCatalogMoneyHasNoSideEffects(String value) {
        product.setPrice(value == null ? null : new BigDecimal(value));

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request(), java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"9999999998", "9999999999", "9999999999.00"})
    void validMoneyBoundaryPersistsExactly(String value) {
        product.setPrice(new BigDecimal(value));

        var result = service.createOrder(1L, request(), java.util.UUID.randomUUID().toString()).order();

        assertEquals(0, new BigDecimal(value).compareTo(result.getTotalAmount()));
        assertEquals(199, product.getStock());
        assertEquals(1, product.getReservedStock());
        verify(orders).saveAndFlush(any());
    }

    @Test
    void lineTotalOverflowRejectedBeforeMutation() {
        product.setPrice(new BigDecimal("5000000000"));
        var request = request();
        request.getItems().get(0).setQuantity(2);

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
    }

    @Test
    void multipleLineSubtotalOverflowDoesNotReserveEarlierLines() {
        product.setPrice(new BigDecimal("5000000000"));
        var second = Product.builder().id(11L).name("Second").price(product.getPrice())
                .stock(200).reservedStock(0).build();
        when(products.findByIdForUpdate(11L)).thenReturn(Optional.of(second));
        var request = request();
        request.setItems(List.of(new OrderItemRequest(10L, 1), new OrderItemRequest(11L, 1)));
        request.setVoucherCode("SALE");

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
        assertEquals(200, second.getStock());
        assertEquals(0, second.getReservedStock());
    }

    @Test
    void lateInvalidProductDoesNotReserveEarlierLines() {
        var second = Product.builder().id(11L).name("Second").price(new BigDecimal("1.1"))
                .stock(200).reservedStock(0).build();
        when(products.findByIdForUpdate(11L)).thenReturn(Optional.of(second));
        var request = request();
        request.setItems(List.of(new OrderItemRequest(10L, 1), new OrderItemRequest(11L, 1)));

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void invalidInputRejectedAtServiceBeforeMutation(Consumer<OrderCreateRequest> mutation) {
        var request = request();
        mutation.accept(request);

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void invalidHttpInputReturns400(Consumer<OrderCreateRequest> mutation) throws Exception {
        var request = request();
        mutation.accept(request);

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request))).andExpect(status().isBadRequest());

        assertUnchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"2147483648", "1.5", "1e100"})
    void invalidJsonQuantityReturns400(String quantity) throws Exception {
        String body = json.writeValueAsString(request()).replace("\"quantity\":1", "\"quantity\":" + quantity);

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isBadRequest());

        assertUnchanged();
    }

    @Test
    void fractionalProductIdReturns400() throws Exception {
        String body = json.writeValueAsString(request()).replace("\"productId\":10", "\"productId\":10.5");

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isBadRequest());

        assertUnchanged();
    }

    @Test
    void invalidCatalogPriceReturns400Not500() throws Exception {
        product.setPrice(new BigDecimal("100.25"));

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request()))).andExpect(status().isBadRequest());

        assertUnchanged();
    }

    @Test
    void hundredLinesAndStringBoundariesSucceedWithoutTruncation() throws Exception {
        var request = request();
        request.setItems(java.util.stream.IntStream.range(0, 100)
                .mapToObj(i -> new OrderItemRequest(10L, 1)).toList());
        request.setCustomerName("N".repeat(100));
        request.setNote("X".repeat(2000));
        request.setShippingPhone("+84900000000");
        request.getItems().get(0).setSelectedColor("C".repeat(50));
        request.getItems().get(0).setStringingService("S".repeat(100));

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request))).andExpect(status().isCreated());

        assertEquals(100, product.getStock());
        assertEquals(100, product.getReservedStock());
        verify(products).findByIdForUpdate(10L);
        verify(orders).saveAndFlush(argThat(order -> order.getItems().size() == 100
                && order.getCustomerName().length() == 100 && order.getNote().length() == 2000));
    }

    @Test
    void percentageRoundingToZeroDoesNotConsumeVoucher() {
        product.setPrice(BigDecimal.ONE);
        Voucher voucher = Voucher.builder().code("SALE").discountType("PERCENT")
                .discountValue(BigDecimal.ONE).build();
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request();
        request.setVoucherCode("SALE");

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
        assertEquals(0, voucher.getUsedCount());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0.5", "10000000000"})
    void invalidFixedDiscountDoesNotConsumeVoucher(String value) {
        Voucher voucher = Voucher.builder().code("SALE").discountValue(new BigDecimal(value)).build();
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request();
        request.setVoucherCode("SALE");

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order());

        assertUnchanged();
        assertEquals(0, voucher.getUsedCount());
    }

    @Test
    void validDiscountAndServerShippingRemainExact() {
        Voucher voucher = Voucher.builder().code("SALE").discountValue(new BigDecimal("10000")).build();
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request();
        request.setVoucherCode("SALE");
        request.setShippingFee(new BigDecimal("9999999999"));

        var response = service.createOrder(1L, request, java.util.UUID.randomUUID().toString()).order();

        assertEquals(0, new BigDecimal("120000").compareTo(response.getTotalAmount()));
        assertEquals(0, new BigDecimal("30000").compareTo(response.getShippingFee()));
        assertEquals(1, voucher.getUsedCount());
    }

    @ParameterizedTest
    @CsvSource({"10000, 20000, 520000", "30000, 0, 500000", "90000, 0, 500000"})
    void shippingVoucherOnlyReducesActualServerShipping(String value, String fee, String total) {
        product.setPrice(new BigDecimal("500000"));
        Voucher voucher = testVoucher("SHIPPING", value);
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request(); request.setVoucherCode("SALE"); request.setShippingFee(BigDecimal.ZERO);

        var response = service.createOrder(1L, request, UUID.randomUUID().toString()).order();

        assertEquals(0, BigDecimal.ZERO.compareTo(response.getDiscountAmount()));
        assertEquals(0, new BigDecimal(fee).compareTo(response.getShippingFee()));
        assertEquals(0, new BigDecimal(total).compareTo(response.getTotalAmount()));
        assertEquals(1, voucher.getUsedCount());
        assertEquals(199, product.getStock());
    }

    @ParameterizedTest
    @ValueSource(strings = {"1000000", "2000000"})
    void alreadyFreeShippingCannotConsumeShippingVoucher(String subtotal) {
        product.setPrice(new BigDecimal(subtotal));
        Voucher voucher = testVoucher("SHIPPING", "30000");
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request(); request.setVoucherCode("SALE");

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, UUID.randomUUID().toString()));

        assertUnchanged(); assertEquals(0, voucher.getUsedCount());
    }

    @Test
    void oddSubtotalPercentageRoundsDownToWholeVnd() {
        product.setPrice(new BigDecimal("150001"));
        Voucher voucher = testVoucher("PERCENT", "10");
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));
        var request = request(); request.setVoucherCode("SALE");

        var response = service.createOrder(1L, request, UUID.randomUUID().toString()).order();

        assertEquals(0, new BigDecimal("15000").compareTo(response.getDiscountAmount()));
        assertEquals(0, new BigDecimal("165001").compareTo(response.getTotalAmount()));
        assertEquals(1, voucher.getUsedCount());
    }

    @Test
    void percentageCapAndLegacySubtotalContractRemainExact() {
        Voucher voucher = testVoucher("PERCENT", "12.25");
        voucher.setMaxDiscountAmount(new BigDecimal("10000"));
        when(vouchers.findByCodeIgnoreCase("SALE")).thenReturn(Optional.of(voucher));

        var response = voucherService().validateVoucher(new VoucherValidateRequest("SALE", new BigDecimal("150001")));

        assertEquals(0, new BigDecimal("10000").compareTo(response.getDiscountAmount()));
        assertEquals(0, new BigDecimal("140001").compareTo(response.getFinalTotal()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getShippingDiscountAmount()));
        assertEquals(0, new BigDecimal("30000").compareTo(response.getFinalShippingFee()));
        assertEquals(0, voucher.getUsedCount()); verify(vouchers, never()).save(any());
    }

    @Test
    void validateHttpReportsShippingSeparatelyWithoutReservingUsage() throws Exception {
        Voucher voucher = testVoucher("SHIPPING", "30000");
        when(vouchers.findByCodeIgnoreCase("SALE")).thenReturn(Optional.of(voucher));

        voucherMvc().perform(post("/api/vouchers/validate").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"SALE\",\"orderTotal\":500000}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.discountAmount").value(0))
                .andExpect(jsonPath("$.finalTotal").value(500000))
                .andExpect(jsonPath("$.shippingDiscountAmount").value(30000))
                .andExpect(jsonPath("$.finalShippingFee").value(0));

        verify(vouchers, never()).save(any()); assertEquals(0, voucher.getUsedCount());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0.5", "10000000000"})
    void invalidVoucherTotalReturns400WithoutRepositoryLookup(String amount) throws Exception {
        voucherMvc().perform(post("/api/vouchers/validate").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"SALE\",\"orderTotal\":" + amount + "}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(vouchers);
    }

    @Test
    void wholeVndWithTrailingDecimalsRemainsCompatibleAtHttpBoundary() throws Exception {
        when(vouchers.findByCodeIgnoreCase("SALE")).thenReturn(Optional.of(testVoucher("FIXED", "10000.00")));
        when(vouchers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        voucherMvc().perform(post("/api/vouchers/validate").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"SALE\",\"orderTotal\":500000.00}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.finalTotal").value(490000));
        voucherMvc().perform(post("/api/admin/vouchers").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"NEW\",\"discountValue\":10000.00,\"minOrderValue\":200000.00,\"maxDiscountAmount\":10000.00}"))
                .andExpect(status().isCreated());
    }

    @ParameterizedTest
    @CsvSource({"PERCENT, 0", "PERCENT, -1", "PERCENT, 100.01", "PERCENT, 1.001", "UNKNOWN, 1000", "SHIPPING, 0", "FIXED, 0.5"})
    void invalidVoucherConfigurationIsRejectedBeforeSaving(String type, String value) {
        VoucherDto dto = VoucherDto.builder().code("HGTEST").discountType(type).discountValue(new BigDecimal(value)).build();

        assertThrows(BadRequestException.class, () -> voucherService().createVoucher(dto));

        verify(vouchers, never()).save(any());
    }

    @Test
    void createVoucherRejectsMissingValueAndDuplicateCode() {
        VoucherDto dto = VoucherDto.builder().code("sale").discountValue(BigDecimal.TEN).build();
        when(vouchers.findByCodeIgnoreCase("SALE")).thenReturn(Optional.of(testVoucher("FIXED", "10")));

        assertThrows(BadRequestException.class, () -> voucherService().createVoucher(dto));
        assertThrows(BadRequestException.class, () -> voucherService().createVoucher(VoucherDto.builder().code("NEW").build()));

        verify(vouchers, never()).save(any());
    }

    @Test
    void adminHttpRejectsInvalidConfigurationAndTamperedUsage() throws Exception {
        voucherMvc().perform(post("/api/admin/vouchers").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"HGTEST\",\"discountValue\":-1}"))
                .andExpect(status().isBadRequest());
        Voucher voucher = editableVoucher();
        when(vouchers.findByIdForUpdate(3L)).thenReturn(Optional.of(voucher));
        when(vouchers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        voucherMvc().perform(put("/api/admin/vouchers/3").contentType(MediaType.APPLICATION_JSON)
                .content("{\"isActive\":false,\"usedCount\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usedCount").value(4))
                .andExpect(jsonPath("$.isActive").value(false));

        assertEquals(4, voucher.getUsedCount()); verify(vouchers, never()).findById(any());
    }

    @Test
    void partialTogglePreservesConfigurationAndExplicitNullClearsNullableFields() throws Exception {
        Voucher voucher = editableVoucher();
        when(vouchers.findByIdForUpdate(3L)).thenReturn(Optional.of(voucher));
        when(vouchers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        VoucherDto toggle = new VoucherDto(); toggle.setIsActive(false);

        var result = voucherService().updateVoucher(3L, toggle);
        assertEquals(4, result.getUsedCount()); assertEquals(10, result.getMaxUses());
        assertNotNull(result.getExpiresAt()); assertNotNull(result.getMaxDiscountAmount()); assertFalse(result.getIsActive());
        VoucherDto clear = new ObjectMapper().findAndRegisterModules().readValue(
                "{\"maxUses\":null,\"maxDiscountAmount\":null,\"expiresAt\":null}", VoucherDto.class);
        var cleared = voucherService().updateVoucher(3L, clear);

        assertNull(cleared.getMaxUses()); assertNull(cleared.getMaxDiscountAmount()); assertNull(cleared.getExpiresAt());
        assertFalse(cleared.getIsActive()); assertEquals(4, cleared.getUsedCount());
        verify(vouchers, times(2)).findByIdForUpdate(3L); verify(vouchers, never()).findById(any());
    }

    @Test
    void updateCannotRenameCodeOrReduceCapBelowUsageAndDoesNotMutateOnError() {
        Voucher voucher = editableVoucher();
        when(vouchers.findByIdForUpdate(3L)).thenReturn(Optional.of(voucher));
        VoucherDto rename = new VoucherDto(); rename.setCode("DIFFERENT");
        VoucherDto cap = new VoucherDto(); cap.setMaxUses(3); cap.setDescription("Không được lưu");

        assertThrows(BadRequestException.class, () -> voucherService().updateVoucher(3L, rename));
        assertThrows(BadRequestException.class, () -> voucherService().updateVoucher(3L, cap));

        assertEquals("SALE", voucher.getCode()); assertEquals(10, voucher.getMaxUses());
        assertEquals("Mô tả gốc", voucher.getDescription()); assertEquals(4, voucher.getUsedCount());
        verify(vouchers, never()).save(any());
    }

    @Test
    void exhaustedVoucherAndOverflowCannotIncrementUsage() {
        Voucher voucher = testVoucher("FIXED", "10000"); voucher.setMaxUses(4); voucher.setUsedCount(4);
        when(vouchers.findByCodeForUpdate("SALE")).thenReturn(Optional.of(voucher));

        assertThrows(BadRequestException.class, () -> voucherService().reserveVoucher(new VoucherValidateRequest("SALE", new BigDecimal("500000"))));
        voucher.setMaxUses(null); voucher.setUsedCount(Integer.MAX_VALUE);
        assertThrows(BadRequestException.class, () -> voucherService().reserveVoucher(new VoucherValidateRequest("SALE", new BigDecimal("500000"))));

        assertEquals(Integer.MAX_VALUE, voucher.getUsedCount()); verify(vouchers, never()).save(any());
    }

    private VoucherService voucherService() {
        return new VoucherService(vouchers, orders, products, new MockEnvironment());
    }

    @Test
    void scopedVoucherRejectsLegacyPayloadWithoutItemsAtHttpBoundary() throws Exception {
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));

        voucherMvc().perform(post("/api/vouchers/validate").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"BWF50K\",\"orderTotal\":1000000}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(
                        "Mã BWF50K cần giỏ hàng có từ 1 đến 100 dòng sản phẩm để kiểm tra danh mục"));

        verify(vouchers, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(longs = {3, 4, 5})
    void scopedVoucherRejectsOtherCategoriesEvenWhenTotalMeetsMinimum(long categoryId) {
        configureScopedProduct(categoryId, "1500000");
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));

        assertThrows(BadRequestException.class, () -> voucherService().validateVoucher(scopedRequest("1500000")));

        verify(vouchers, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(longs = {1, 2})
    void scopedVoucherAcceptsServerVerifiedRacketAndShoeTotals(long categoryId) {
        configureScopedProduct(categoryId, "1000000");
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));

        var result = voucherService().validateVoucher(scopedRequest("1000000"));

        assertEquals(new BigDecimal("50000"), result.getDiscountAmount());
        assertEquals(new BigDecimal("950000"), result.getFinalTotal());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getFinalShippingFee()));
        verify(vouchers, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"900000", "1000000"})
    void mixedCartMinimumExcludesAccessoryValue(String racketPrice) {
        configureScopedProduct(1L, racketPrice);
        var accessory = Product.builder().id(20L).price(new BigDecimal("600000"))
                .category(Category.builder().id(5L).build()).build();
        when(products.findById(20L)).thenReturn(Optional.of(accessory));
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));
        var request = new VoucherValidateRequest("BWF50K", new BigDecimal(racketPrice).add(accessory.getPrice()),
                List.of(new OrderItemRequest(10L, 1), new OrderItemRequest(20L, 1)));

        if ("900000".equals(racketPrice)) assertThrows(BadRequestException.class,
                () -> voucherService().validateVoucher(request));
        else assertEquals(new BigDecimal("1550000"), voucherService().validateVoucher(request).getFinalTotal());

        verify(vouchers, never()).save(any());
    }

    @Test
    void scopedDiscountIsClampedToEligibleLinesAndNotAccessories() {
        configureScopedProduct(1L, "1000000");
        var accessory = Product.builder().id(20L).price(new BigDecimal("600000"))
                .category(Category.builder().id(5L).build()).build();
        when(products.findById(20L)).thenReturn(Optional.of(accessory));
        Voucher voucher = scopedVoucher(); voucher.setDiscountValue(new BigDecimal("2000000"));
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(voucher));
        var request = new VoucherValidateRequest("BWF50K", new BigDecimal("1600000"),
                List.of(new OrderItemRequest(10L, 1), new OrderItemRequest(20L, 1)));

        var result = voucherService().validateVoucher(request);

        assertEquals(new BigDecimal("1000000"), result.getDiscountAmount());
        assertEquals(new BigDecimal("600000"), result.getFinalTotal());
    }

    @Test
    void scopedVoucherRejectsHiddenMissingAndStalePriceBeforeReservation() {
        configureScopedProduct(1L, "1000000");
        when(vouchers.findByCodeForUpdate("BWF50K")).thenReturn(Optional.of(scopedVoucher()));

        assertThrows(BadRequestException.class, () -> voucherService().reserveVoucher(scopedRequest("1500000")));
        product.setCatalogVisible(false);
        assertThrows(BadRequestException.class, () -> voucherService().reserveVoucher(scopedRequest("1000000")));
        when(products.findById(10L)).thenReturn(Optional.empty());
        assertThrows(BadRequestException.class, () -> voucherService().reserveVoucher(scopedRequest("1000000")));

        verify(vouchers, never()).save(any());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(ints = {-1, 0, 101})
    void scopedVoucherRejectsInvalidQuantities(Integer quantity) {
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));
        var request = new VoucherValidateRequest("BWF50K", new BigDecimal("1000000"),
                List.of(new OrderItemRequest(10L, quantity)));

        assertThrows(BadRequestException.class, () -> voucherService().validateVoucher(request));

        verifyNoInteractions(products); verify(vouchers, never()).save(any());
    }

    @Test
    void scopedVoucherRejectsMoreThanHundredLinesAndAggregateDuplicateQuantity() {
        when(vouchers.findByCodeIgnoreCase("BWF50K")).thenReturn(Optional.of(scopedVoucher()));
        var request = new VoucherValidateRequest("BWF50K", new BigDecimal("1000000"),
                Collections.nCopies(101, new OrderItemRequest(10L, 1)));

        assertThrows(BadRequestException.class, () -> voucherService().validateVoucher(request));
        request.setItems(List.of(new OrderItemRequest(10L, 60), new OrderItemRequest(10L, 60)));
        assertThrows(BadRequestException.class, () -> voucherService().validateVoucher(request));

        verifyNoInteractions(products); verify(vouchers, never()).save(any());
    }

    @Test
    void createOrderAppliesSameScopedVoucherPolicyAndOnlyReservesEligibleBasket() {
        configureScopedProduct(5L, "1000000");
        Voucher voucher = scopedVoucher();
        when(vouchers.findByCodeForUpdate("BWF50K")).thenReturn(Optional.of(voucher));
        var request = request(); request.setVoucherCode("BWF50K");

        assertThrows(BadRequestException.class, () -> service.createOrder(1L, request, UUID.randomUUID().toString()));
        assertUnchanged();
        product.setCategory(Category.builder().id(1L).build());
        var order = service.createOrder(1L, request, UUID.randomUUID().toString()).order();

        assertEquals(new BigDecimal("50000"), order.getDiscountAmount());
        assertEquals(new BigDecimal("950000"), order.getTotalAmount());
        assertEquals(1, voucher.getUsedCount());
    }

    @Test
    void voucherWithCancelledHistoryCannotBeDeletedEvenAfterUsageReturnsToZero() throws Exception {
        Voucher voucher = testVoucher("FIXED", "10000"); voucher.setId(8L);
        when(vouchers.findByIdForUpdate(8L)).thenReturn(Optional.of(voucher));
        when(orders.existsByVoucherCodeIgnoreCase("SALE")).thenReturn(true);

        voucherMvc().perform(delete("/api/admin/vouchers/8")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Voucher đã có lịch sử sử dụng hoặc đơn hàng; hãy tạm tắt thay vì xóa"));

        verify(vouchers, never()).delete(any()); verify(vouchers, never()).findById(any());
    }

    @Test
    void usedVoucherCannotBeDeletedEvenWithoutOrderHistory() {
        Voucher voucher = testVoucher("FIXED", "10000"); voucher.setUsedCount(1);
        when(vouchers.findByIdForUpdate(8L)).thenReturn(Optional.of(voucher));

        assertThrows(BadRequestException.class, () -> voucherService().deleteVoucher(8L));

        verify(vouchers, never()).delete(any());
    }

    @Test
    void unusedVoucherWithoutHistoryCanStillBeDeletedUnderLock() {
        Voucher voucher = testVoucher("FIXED", "10000");
        when(vouchers.findByIdForUpdate(8L)).thenReturn(Optional.of(voucher));

        voucherService().deleteVoucher(8L);

        verify(orders).existsByVoucherCodeIgnoreCase("SALE"); verify(vouchers).delete(voucher);
        verify(vouchers, never()).findById(any());
    }

    @Test
    void removedHistoricalCodeCannotBeRecreatedAndCancelDoesNotDecrementAnotherVoucher() {
        when(orders.existsByVoucherCodeIgnoreCase("SALE")).thenReturn(true);
        VoucherDto dto = VoucherDto.builder().code("sale").discountValue(new BigDecimal("10000")).build();

        assertThrows(BadRequestException.class, () -> voucherService().createVoucher(dto));
        voucherService().releaseVoucher("SALE");

        verify(vouchers, never()).save(any()); verify(vouchers).findByCodeForUpdate("SALE");
    }

    private void configureScopedProduct(long categoryId, String price) {
        product.setCategory(Category.builder().id(categoryId).build());
        product.setPrice(new BigDecimal(price));
        when(products.findById(10L)).thenReturn(Optional.of(product));
    }

    private VoucherValidateRequest scopedRequest(String total) {
        return new VoucherValidateRequest("BWF50K", new BigDecimal(total), List.of(new OrderItemRequest(10L, 1)));
    }

    private Voucher scopedVoucher() {
        return Voucher.builder().code("BWF50K").discountValue(new BigDecimal("50000"))
                .minOrderValue(new BigDecimal("1000000")).build();
    }

    private MockMvc voucherMvc() {
        VoucherService handler = voucherService();
        return MockMvcBuilders.standaloneSetup(new AdminVoucherController(handler), new VoucherController(handler))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private Voucher testVoucher(String type, String value) {
        return Voucher.builder().code("SALE").discountType(type).discountValue(new BigDecimal(value)).build();
    }

    private Voucher editableVoucher() {
        return Voucher.builder().id(3L).code("SALE").description("Mô tả gốc").discountType("FIXED")
                .discountValue(new BigDecimal("10000")).maxDiscountAmount(new BigDecimal("50000"))
                .maxUses(10).usedCount(4).expiresAt(java.time.LocalDateTime.now().plusDays(30)).isActive(true).build();
    }

    @Test
    void insufficientStockReturnsConflictWithoutMutation() throws Exception {
        var request = request();
        request.getItems().get(0).setQuantity(2);
        product.setStock(1);

        mvc.perform(post("/api/orders").header("Idempotency-Key", java.util.UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request))).andExpect(status().isConflict());

        assertEquals(1, product.getStock());
        assertEquals(0, product.getReservedStock());
        verify(products, never()).save(any());
        verify(orders, never()).saveAndFlush(any());
        verifyNoInteractions(vouchers, gateway);
    }

    @Test
    void nullRequestIsRejectedWithoutMutation() {
        assertThrows(BadRequestException.class, () -> service.createOrder(1L, null, java.util.UUID.randomUUID().toString()).order());
        assertUnchanged();
    }

    private void assertUnchanged() {
        assertEquals(200, product.getStock());
        assertEquals(0, product.getReservedStock());
        verify(products, never()).save(any());
        verify(orders, never()).saveAndFlush(any());
        verify(vouchers, never()).save(any());
        verifyNoInteractions(gateway);
    }

    private OrderCreateRequest request() {
        var request = new OrderCreateRequest();
        request.setItems(List.of(new OrderItemRequest(10L, 1)));
        request.setCustomerName("Khách kiểm thử");
        request.setShippingPhone("0900000000");
        request.setShippingAddress("Địa chỉ kiểm thử");
        request.setPaymentMethod("COD");
        return request;
    }

    private HandlerMethodArgumentResolver principalResolver() {
        return new HandlerMethodArgumentResolver() {
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == CustomUserDetails.class;
            }
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory factory) {
                return new CustomUserDetails(user);
            }
        };
    }

    static Stream<Consumer<OrderCreateRequest>> invalidRequests() {
        return Stream.concat(invalidItems(), invalidStrings());
    }

    private static Stream<Consumer<OrderCreateRequest>> invalidItems() {
        return Stream.of(r -> r.setItems(null), r -> r.setItems(List.of()),
                r -> r.setItems(Collections.singletonList(null)),
                r -> r.setItems(Collections.nCopies(101, new OrderItemRequest(10L, 1))),
                r -> r.setItems(List.of(new OrderItemRequest(10L, 60), new OrderItemRequest(10L, 41))),
                r -> r.getItems().get(0).setProductId(null),
                r -> r.getItems().get(0).setProductId(0L),
                r -> r.getItems().get(0).setProductId(-1L),
                r -> r.getItems().get(0).setQuantity(null),
                r -> r.getItems().get(0).setQuantity(0),
                r -> r.getItems().get(0).setQuantity(-1),
                r -> r.getItems().get(0).setQuantity(101),
                r -> r.getItems().get(0).setQuantity(Integer.MAX_VALUE));
    }

    private static Stream<Consumer<OrderCreateRequest>> invalidStrings() {
        return Stream.of(r -> r.setCustomerName("N".repeat(101)), r -> r.setCustomerName(" "),
                r -> r.setShippingPhone("1".repeat(21)), r -> r.setShippingPhone("0|00000000"),
                r -> r.setShippingPhone("abc"), r -> r.setNote("N".repeat(2001)),
                r -> r.setVoucherCode("V".repeat(51)), r -> r.setPaymentMethod("X".repeat(51)),
                r -> r.getItems().get(0).setSelectedSize("S".repeat(51)),
                r -> r.getItems().get(0).setSelectedColor("C".repeat(201)),
                r -> r.getItems().get(0).setSelectedWeight("W".repeat(51)),
                r -> r.getItems().get(0).setStringTension("T".repeat(51)),
                r -> r.getItems().get(0).setStringingService("S".repeat(101)),
                r -> r.setShippingFee(new BigDecimal("-1")),
                r -> r.setShippingFee(new BigDecimal("0.5")),
                r -> r.setShippingFee(new BigDecimal("10000000000")));
    }
}
