package com.sports.service;

import com.sports.dto.*;
import com.sports.entity.PaymentAttempt;
import com.sports.exception.BadRequestException;
import com.sports.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class AdminReportService {
    private final OrderService orders;
    private final PaymentAttemptRepository payments;
    private final UserRepository users;
    private final ProductRepository products;
    private final OrderRepository orderRepository;
    private final PaymentEnvironmentService paymentEnvironment;
    public record ReportRow(OrderResponse order, LocalDateTime receivedAt, boolean confirmed, BigDecimal recognizedAmount) {}
    public record Report(DashboardStatsResponse stats, List<ReportRow> rows) {}

    @Transactional(readOnly = true)
    public Report report(LocalDate from, LocalDate to) {
        validateRange(from, to);
        Map<Long, PaymentAttempt> proofs = payments.findAll().stream().collect(Collectors.toMap(p -> p.getOrder().getId(), p -> p));
        Set<Long> recognized = orderRepository.findRecognizedPaymentOrders().stream()
                .map(com.sports.entity.Order::getId).collect(Collectors.toSet());
        List<ReportRow> all = orders.getAllOrders().stream()
                .map(order -> receipt(order, proofs.get(order.getId()), recognized.contains(order.getId()), from, to)).toList();
        List<ReportRow> selected = all.stream().filter(row -> inRange(row.order().getCreatedAt(), from, to)
                || row.confirmed() && inRange(row.receivedAt(), from, to)).toList();
        BigDecimal revenue = all.stream().map(ReportRow::recognizedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long unverified = selected.stream().filter(row -> !row.confirmed() && Set.of("PAID", "SHIPPING", "COMPLETED").contains(row.order().getStatus())).count();
        var stats = DashboardStatsResponse.builder().totalRevenue(revenue).totalOrders((long) selected.size())
                .totalCustomers(users.count()).totalProducts(products.count())
                .pendingOrders(selected.stream().filter(row -> "PENDING".equals(row.order().getStatus())).count())
                .paidOrders(all.stream().filter(row -> row.recognizedAmount().signum() > 0).count())
                .recentOrders(selected.stream().limit(5).map(ReportRow::order).toList()).dailyRevenue(daily(all, from, to))
                .unverifiedPaidOrders(unverified).topSellingProducts(topSelling(all))
                .revenueBasis("Theo ngày nhận tiền PayOS có bằng chứng hợp lệ hoặc xác nhận thu COD không có xung đột; giá trị hàng bán chạy trước voucher, điểm và phí vận chuyển")
                .build();
        return new Report(stats, selected);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if ((from == null) != (to == null)) throw new BadRequestException("Cần chọn đủ ngày bắt đầu và kết thúc");
        if (from != null && (from.isAfter(to) || java.time.temporal.ChronoUnit.DAYS.between(from, to) > 366)) {
            throw new BadRequestException("Khoảng báo cáo phải hợp lệ và không vượt 366 ngày");
        }
    }

    private ReportRow receipt(OrderResponse order, PaymentAttempt proof, boolean recognized, LocalDate from, LocalDate to) {
        boolean cash = recognized && "COD".equals(order.getPaymentMethod()) && Boolean.TRUE.equals(order.getCashCollected());
        boolean payos = recognized && "PAYOS_VIETQR".equals(order.getPaymentMethod()) && proof != null && "PAYOS".equals(proof.getProvider())
                && proof.getStatus() == PaymentAttempt.Status.PAID
                && proof.getPaidAt() != null && proof.getAmount() != null && order.getTotalAmount() != null
                && proof.getAmount().compareTo(order.getTotalAmount()) == 0
                && Set.of("PAID", "SHIPPING", "COMPLETED").contains(order.getStatus());
        LocalDateTime received = cash ? order.getCashCollectedAt() : payos ? proof.getPaidAt() : null;
        boolean confirmed = recognized && (cash || payos) && received != null;
        if (!confirmed) received = null;
        return new ReportRow(order, received, confirmed, confirmed && inRange(received, from, to) ? order.getTotalAmount() : BigDecimal.ZERO);
    }

    private List<DashboardStatsResponse.TopSellingProduct> topSelling(List<ReportRow> rows) {
        Map<String, DashboardStatsResponse.TopSellingProduct> totals = new LinkedHashMap<>();
        rows.stream().filter(row -> row.recognizedAmount().signum() > 0).forEach(row -> {
            if (row.order().getItems() == null) return;
            for (OrderItemResponse item : row.order().getItems()) {
                if (item.getQuantity() == null || item.getQuantity() <= 0 || item.getPrice() == null) continue;
                var value = new DashboardStatsResponse.TopSellingProduct(item.getProductId(), item.getProductSku(),
                        item.getProductName(), item.getQuantity().longValue(), item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())),
                        Boolean.TRUE.equals(item.getProductDeleted()));
                totals.merge(rankingKey(item), value, this::mergeRanking);
            }
        });
        return totals.values().stream().sorted(Comparator.comparingLong(DashboardStatsResponse.TopSellingProduct::quantity).reversed()
                .thenComparing(DashboardStatsResponse.TopSellingProduct::grossMerchandiseAmount, Comparator.reverseOrder())
                .thenComparing(value -> Objects.toString(value.productName(), ""))).limit(5).toList();
    }

    private String rankingKey(OrderItemResponse item) {
        if (item.getProductId() != null) return "id:" + item.getProductId();
        if (item.getProductSku() != null && !item.getProductSku().isBlank()) return "sku:" + item.getProductSku();
        return "line:" + item.getId();
    }

    private DashboardStatsResponse.TopSellingProduct mergeRanking(DashboardStatsResponse.TopSellingProduct first,
            DashboardStatsResponse.TopSellingProduct next) {
        return new DashboardStatsResponse.TopSellingProduct(first.productId(), first.productSku(), first.productName(),
                Math.addExact(first.quantity(), next.quantity()), first.grossMerchandiseAmount().add(next.grossMerchandiseAmount()),
                first.productDeleted() || next.productDeleted());
    }

    public Map<String, Object> settings() {
        Map<String, Object> store = new LinkedHashMap<>();
        for (String field : List.of("name", "phone", "email", "address")) store.put(field, null);
        store.put("verified", false);
        return Map.of("readOnly", true, "store", store,
                "shipping", Map.of("fee", VoucherService.quoteShipping(BigDecimal.ONE), "freeShippingThreshold", 1000000),
                "loyalty", Map.of("paidAmountPerPoint", 10000, "pointValue", 100, "maxDiscountPercent", 10),
                "warranty", Map.of("days", 90, "categoryIds", List.of(1, 2, 3, 4)),
                "payment", Map.of("mode", paymentEnvironment.mode(), "connectionVerified", false));
    }

    private boolean inRange(LocalDateTime value, LocalDate from, LocalDate to) {
        if (from == null && to == null) return true;
        return value != null && !value.toLocalDate().isBefore(from) && !value.toLocalDate().isAfter(to);
    }

    private Map<String, BigDecimal> daily(List<ReportRow> rows, LocalDate from, LocalDate to) {
        Map<String, BigDecimal> result = new TreeMap<>();
        if (from != null) for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) result.put(day.toString(), BigDecimal.ZERO);
        for (ReportRow row : rows) if (row.recognizedAmount().signum() > 0) {
            String key = row.receivedAt().toLocalDate().toString();
            result.merge(key, row.recognizedAmount(), BigDecimal::add);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public byte[] export(LocalDate from, LocalDate to, String format) {
        Report report = report(from, to);
        if ("csv".equals(format)) return csv(report);
        if (!"xlsx".equals(format)) throw new BadRequestException("Chỉ hỗ trợ xlsx hoặc csv");
        return workbook(report, from, to);
    }

    private List<List<Object>> table(Report report) {
        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái", "Phương thức", "Ngày tạo", "Ngày nhận tiền", "Đã xác nhận thu tiền", "Doanh thu trong kỳ"));
        for (ReportRow row : report.rows()) {
            OrderResponse order = row.order();
            rows.add(Arrays.asList(order.getId(), order.getCustomerName(), order.getTotalAmount(), order.getStatus(),
                    order.getPaymentMethod(), order.getCreatedAt(), row.receivedAt(), row.confirmed() ? "Có" : "Chưa xác nhận", row.recognizedAmount()));
        }
        return rows;
    }

    private byte[] csv(Report report) {
        String text = "\ufeff" + table(report).stream().map(row -> row.stream().map(this::csvValue)
                .collect(Collectors.joining(","))).collect(Collectors.joining("\r\n"));
        return text.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String csvValue(Object value) {
        String text = value == null ? "" : value.toString();
        String trimmed = text.stripLeading();
        if (!(value instanceof Number) && !trimmed.isEmpty() && "=+@-".indexOf(trimmed.charAt(0)) >= 0) text = "'" + text;
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private byte[] workbook(Report report, LocalDate from, LocalDate to) {
        try (var book = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var stats = report.stats();
            sheet(book, "Tổng quan", List.of(List.of("Chỉ tiêu", "Giá trị"), List.of("Từ ngày", from == null ? "Toàn bộ" : from.toString()),
                    List.of("Đến ngày", to == null ? "Toàn bộ" : to.toString()), List.of("Doanh thu đã xác nhận", stats.getTotalRevenue()),
                    List.of("Đơn trong phạm vi", stats.getTotalOrders()), List.of("Đơn chưa xác minh thu tiền", stats.getUnverifiedPaidOrders()),
                    List.of("Cơ sở doanh thu", stats.getRevenueBasis())));
            sheet(book, "Đơn hàng", table(report));
            List<List<Object>> daily = new ArrayList<>(); daily.add(List.of("Ngày nhận tiền", "Doanh thu"));
            stats.getDailyRevenue().forEach((date, amount) -> daily.add(List.of(date, amount)));
            sheet(book, "Doanh thu theo ngày", daily);
            List<List<Object>> ranking = new ArrayList<>();
            ranking.add(List.of("Mã sản phẩm", "Tên sản phẩm lúc mua", "Số lượng", "Giá trị hàng trước ưu đãi", "Đã ngừng bán"));
            for (var product : stats.getTopSellingProducts()) ranking.add(Arrays.asList(product.productSku(), product.productName(),
                    product.quantity(), product.grossMerchandiseAmount(), product.productDeleted() ? "Có" : "Không"));
            sheet(book, "Sản phẩm bán chạy", ranking);
            book.write(output); return output.toByteArray();
        } catch (IOException ex) { throw new IllegalStateException("Không xuất được báo cáo Excel", ex); }
    }

    private void sheet(XSSFWorkbook book, String name, List<List<Object>> values) {
        Sheet sheet = book.createSheet(name);
        CellStyle header = book.createCellStyle(); Font font = book.createFont(); font.setBold(true); header.setFont(font);
        for (int i = 0; i < values.size(); i++) {
            Row row = sheet.createRow(i);
            for (int j = 0; j < values.get(i).size(); j++) {
                Cell cell = row.createCell(j); Object value = values.get(i).get(j);
                if (value instanceof Number number) cell.setCellValue(number.doubleValue());
                else cell.setCellValue(value == null ? "" : value.toString());
                if (i == 0) cell.setCellStyle(header);
            }
        }
        sheet.createFreezePane(0, 1);
        for (int j = 0; j < values.get(0).size(); j++) { sheet.autoSizeColumn(j); sheet.setColumnWidth(j, Math.min(16000, sheet.getColumnWidth(j) + 500)); }
    }
}
