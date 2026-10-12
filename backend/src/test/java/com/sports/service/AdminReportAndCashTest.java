package com.sports.service;

import com.sports.dto.OrderResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.repository.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminReportAndCashTest {
    private OrderResponse order(Long id, String method, String status) {
        return OrderResponse.builder().id(id).customerName("=HYPERLINK(\"bad\")").totalAmount(new BigDecimal("100000"))
                .paymentMethod(method).status(status).createdAt(LocalDateTime.of(2026, 10, 1, 10, 0)).cashCollected(false).build();
    }

    @Test void reportsUseReceiptDateAndExcludeUnconfirmedLegacyCod() throws Exception {
        var orders = mock(OrderService.class); var payments = mock(PaymentAttemptRepository.class);
        var payos = order(1L, "PAYOS_VIETQR", "PAID"); var cash = order(2L, "COD", "COMPLETED");
        var proof = new PaymentAttempt(); proof.setOrder(Order.builder().id(1L).build()); proof.setAmount(payos.getTotalAmount());
        proof.setStatus(PaymentAttempt.Status.PAID); proof.setPaidAt(LocalDateTime.of(2026, 10, 12, 12, 0));
        when(orders.getAllOrders()).thenReturn(List.of(payos, cash)); when(payments.findAll()).thenReturn(List.of(proof));
        var service = new AdminReportService(orders, payments, mock(UserRepository.class), mock(ProductRepository.class));
        var date = LocalDate.of(2026, 10, 12); var report = service.report(date, date);
        assertEquals(1, report.rows().size()); assertEquals(new BigDecimal("100000"), report.stats().getTotalRevenue());
        assertEquals(new BigDecimal("100000"), report.stats().getDailyRevenue().get("2026-10-12"));
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.export(date, date, "xlsx")))) {
            assertEquals(3, book.getNumberOfSheets()); assertEquals(100000, book.getSheetAt(1).getRow(1).getCell(2).getNumericCellValue());
            assertEquals(org.apache.poi.ss.usermodel.CellType.STRING, book.getSheetAt(1).getRow(1).getCell(1).getCellType());
        }
        String csv = new String(service.export(date, date, "csv"), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("\ufeff")); assertTrue(csv.contains("'=HYPERLINK"));
        assertThrows(BadRequestException.class, () -> service.report(date, date.minusDays(1)));
    }

    @Test void cashConfirmationRequiresCodExactAmountAndIsIdempotent() {
        var repository = mock(OrderRepository.class); var orders = mock(OrderService.class);
        var order = Order.builder().id(9L).status(OrderStatus.SHIPPING).paymentMethod("COD").totalAmount(new BigDecimal("100000")).build();
        when(repository.findByIdForUpdate(9L)).thenReturn(Optional.of(order));
        var service = new CashCollectionService(repository, orders);
        assertThrows(BadRequestException.class, () -> service.collect(9L, 1L, new BigDecimal("1")));
        service.collect(9L, 1L, new BigDecimal("100000")); LocalDateTime first = order.getCashCollectedAt();
        service.collect(9L, 2L, new BigDecimal("100000"));
        assertEquals(first, order.getCashCollectedAt()); assertEquals(1L, order.getCashCollectedBy());
        verify(repository, times(1)).save(order);
        order.setPaymentMethod("PAYOS_VIETQR");
        assertThrows(BadRequestException.class, () -> service.collect(9L, 1L, new BigDecimal("100000")));
    }
}
