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
    @Test void cancelledOrderKeepsUnconfirmedPaymentAttemptSeparate() {
        var order = Order.builder().id(9L).status(OrderStatus.CANCELLED).paymentMethod("PAYOS_VIETQR").build();
        var attempt = new PaymentAttempt();
        attempt.setId(12L); attempt.setOrder(order); attempt.setStatus(PaymentAttempt.Status.CREATING);

        var response = com.sports.dto.AdminPaymentDto.from(attempt);

        assertEquals(OrderStatus.CANCELLED, response.getOrderStatus());
        assertEquals(PaymentAttempt.Status.CREATING, response.getStatus());
        assertNull(response.getPaidAt()); assertNull(response.getReference());
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(PaymentAttempt.Status.CREATING, attempt.getStatus());
    }

    private OrderResponse order(Long id, String method, String status) {
        return OrderResponse.builder().id(id).customerName("=HYPERLINK(\"bad\")").totalAmount(new BigDecimal("100000"))
                .paymentMethod(method).status(status).createdAt(LocalDateTime.of(2026, 10, 1, 10, 0)).cashCollected(false).build();
    }

    @Test void reportsUseReceiptDateAndExcludeUnconfirmedLegacyCod() throws Exception {
        var orders = mock(OrderService.class); var payments = mock(PaymentAttemptRepository.class);
        var payos = order(1L, "PAYOS_VIETQR", "PAID"); var cash = order(2L, "COD", "COMPLETED");
        var proof = new PaymentAttempt(); proof.setOrder(Order.builder().id(1L).build()); proof.setAmount(payos.getTotalAmount());
        proof.setProvider("PAYOS"); proof.setStatus(PaymentAttempt.Status.PAID); proof.setPaidAt(LocalDateTime.of(2026, 10, 12, 12, 0));
        when(orders.getAllOrders()).thenReturn(List.of(payos, cash)); when(payments.findAll()).thenReturn(List.of(proof));
        var repository=mock(OrderRepository.class);
        when(repository.findRecognizedPaymentOrders()).thenReturn(List.of(Order.builder().id(1L).build()));
        var service = new AdminReportService(orders, payments, mock(UserRepository.class), mock(ProductRepository.class),repository,
                mock(PaymentEnvironmentService.class));
        var date = LocalDate.of(2026, 10, 12); var report = service.report(date, date);
        assertEquals(1, report.rows().size()); assertEquals(new BigDecimal("100000"), report.stats().getTotalRevenue());
        assertEquals(new BigDecimal("100000"), report.stats().getDailyRevenue().get("2026-10-12"));
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(service.export(date, date, "xlsx")))) {
            assertEquals(4, book.getNumberOfSheets()); assertEquals(100000, book.getSheetAt(1).getRow(1).getCell(2).getNumericCellValue());
            assertEquals(org.apache.poi.ss.usermodel.CellType.STRING, book.getSheetAt(1).getRow(1).getCell(1).getCellType());
        }
        String csv = new String(service.export(date, date, "csv"), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("\ufeff")); assertTrue(csv.contains("'=HYPERLINK"));
        assertThrows(BadRequestException.class, () -> service.report(date, date.minusDays(1)));
    }

    @Test void reportsRejectMockAndUnrecognizedLateCodOrConflictingProviderProofs() {
        var orders=mock(OrderService.class);var attempts=mock(PaymentAttemptRepository.class);var repository=mock(OrderRepository.class);
        var good=order(1L,"COD","COMPLETED");good.setCashCollected(true);good.setCashCollectedAt(LocalDateTime.now());
        var mock=order(2L,"PAYOS_VIETQR","PAID");var conflict=order(3L,"PAYOS_VIETQR","SHIPPING");
        var late=order(4L,"COD","COMPLETED");late.setCashCollected(true);late.setCashCollectedAt(LocalDateTime.now());
        when(orders.getAllOrders()).thenReturn(List.of(good,mock,conflict,late));
        when(attempts.findAll()).thenReturn(List.of(proof(mock,"MOCK"),proof(conflict,"PAYOS")));
        when(repository.findRecognizedPaymentOrders()).thenReturn(List.of(Order.builder().id(1L).build(),Order.builder().id(2L).build()));
        var service=new AdminReportService(orders,attempts,mock(UserRepository.class),mock(ProductRepository.class),repository,
                mock(PaymentEnvironmentService.class));
        var report=service.report(null,null);
        assertEquals(new BigDecimal("100000"),report.stats().getTotalRevenue());assertEquals(1L,report.stats().getPaidOrders());
        assertEquals(3L,report.stats().getUnverifiedPaidOrders());
        assertTrue(report.rows().stream().filter(row->row.order().getId()!=1L).noneMatch(AdminReportService.ReportRow::confirmed));
        assertTrue(report.rows().stream().filter(row->!row.confirmed()).allMatch(row->row.receivedAt()==null));
    }

    private PaymentAttempt proof(OrderResponse order,String provider) {
        var proof=new PaymentAttempt();proof.setOrder(Order.builder().id(order.getId()).build());proof.setProvider(provider);
        proof.setAmount(order.getTotalAmount());proof.setStatus(PaymentAttempt.Status.PAID);
        proof.setPaidAt(LocalDateTime.of(2026,10,12,12,0));return proof;
    }

    @Test void malformedLegacyProofWithNullAmountIsUnverifiedInsteadOfCrashingReport() {
        var orders=mock(OrderService.class);var attempts=mock(PaymentAttemptRepository.class);var repository=mock(OrderRepository.class);
        var order=order(1L,"PAYOS_VIETQR","PAID");var proof=proof(order,"PAYOS");proof.setAmount(null);
        when(orders.getAllOrders()).thenReturn(List.of(order));when(attempts.findAll()).thenReturn(List.of(proof));
        when(repository.findRecognizedPaymentOrders()).thenReturn(List.of(Order.builder().id(1L).build()));
        var service=new AdminReportService(orders,attempts,mock(UserRepository.class),mock(ProductRepository.class),repository,
                mock(PaymentEnvironmentService.class));
        var report=service.report(null,null);assertEquals(BigDecimal.ZERO,report.stats().getTotalRevenue());
        assertEquals(1L,report.stats().getUnverifiedPaidOrders());assertFalse(report.rows().get(0).confirmed());
        assertNull(report.rows().get(0).receivedAt());
    }

    private com.sports.dto.OrderItemResponse sold(Long id,Long productId,String sku,String name,int quantity,int price,boolean deleted) {
        return com.sports.dto.OrderItemResponse.builder().id(id).productId(productId).productSku(sku).productName(name)
                .quantity(quantity).price(BigDecimal.valueOf(price)).productDeleted(deleted).build();
    }

    @Test void rankingUsesSnapshotQuantityAndReceiptRangeAndExportLabelsGrossMerchandise() throws Exception {
        var orders=mock(OrderService.class);var attempts=mock(PaymentAttemptRepository.class);var repository=mock(OrderRepository.class);
        var first=order(1L,"PAYOS_VIETQR","COMPLETED");
        var second=order(2L,"PAYOS_VIETQR","PAID");
        first.setItems(List.of(sold(10L,30L,"HG-RACKET-030","Tên cũ lúc mua",2,50000,true),sold(11L,31L,"HG-SHOE-031","Giày",3,20000,false)));
        second.setItems(List.of(sold(12L,30L,"OLD-030","Cùng sản phẩm đổi tên",2,60000,true)));
        var ignored=order(3L,"PAYOS_VIETQR","COMPLETED");ignored.setItems(List.of(sold(13L,99L,"HG-099","Ngoài kỳ",100,50000,false)));
        var oldProof=proof(ignored,"PAYOS");oldProof.setPaidAt(LocalDateTime.of(2026,10,11,10,0));
        when(orders.getAllOrders()).thenReturn(List.of(first,second,ignored));
        when(attempts.findAll()).thenReturn(List.of(proof(first,"PAYOS"),proof(second,"PAYOS"),oldProof));
        when(repository.findRecognizedPaymentOrders()).thenReturn(List.of(Order.builder().id(1L).build(),Order.builder().id(2L).build(),Order.builder().id(3L).build()));
        var service=new AdminReportService(orders,attempts,mock(UserRepository.class),mock(ProductRepository.class),repository,mock(PaymentEnvironmentService.class));
        var day=LocalDate.of(2026,10,12);var ranking=service.report(day,day).stats().getTopSellingProducts();
        assertEquals(2,ranking.size());assertEquals(30L,ranking.get(0).productId());assertEquals(4L,ranking.get(0).quantity());
        assertEquals(new BigDecimal("220000"),ranking.get(0).grossMerchandiseAmount());assertTrue(ranking.get(0).productDeleted());
        assertEquals("Tên cũ lúc mua",ranking.get(0).productName());assertEquals("HG-RACKET-030",ranking.get(0).productSku());
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(service.export(day,day,"xlsx")))) {
            assertEquals("Giá trị hàng trước ưu đãi",book.getSheet("Sản phẩm bán chạy").getRow(0).getCell(3).getStringCellValue());
            assertEquals(4,book.getSheet("Sản phẩm bán chạy").getRow(1).getCell(2).getNumericCellValue());
        }
    }

    @Test void settingsAreReadOnlyActualPolicyAndExcludeCredentialsOrUnverifiedStoreClaims() {
        var environment=mock(PaymentEnvironmentService.class);when(environment.mode()).thenReturn("REAL");
        var service=new AdminReportService(mock(OrderService.class),mock(PaymentAttemptRepository.class),mock(UserRepository.class),
                mock(ProductRepository.class),mock(OrderRepository.class),environment);
        var settings=service.settings();assertEquals(true,settings.get("readOnly"));
        assertEquals(Map.of("fee",new BigDecimal("30000"),"freeShippingThreshold",1000000),settings.get("shipping"));
        assertEquals(Map.of("paidAmountPerPoint",10000,"pointValue",100,"maxDiscountPercent",10),settings.get("loyalty"));
        assertEquals(Map.of("days",90,"categoryIds",List.of(1,2,3,4)),settings.get("warranty"));
        assertEquals(Map.of("mode","REAL","connectionVerified",false),settings.get("payment"));
        var store=(Map<?,?>)settings.get("store");assertNull(store.get("phone"));assertEquals(false,store.get("verified"));
        assertFalse(settings.toString().toLowerCase().contains("key"));assertFalse(settings.toString().toLowerCase().contains("token"));
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
