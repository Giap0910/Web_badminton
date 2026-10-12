package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.dto.ProductDto;
import com.sports.exception.BadRequestException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.*;
import java.util.*;

@Service
public class ProductExcelService {
    public static final List<String> SHEETS = List.of("Vợt", "Giày", "Quần áo", "Túi - Balo", "Phụ kiện");
    public static final List<String> HEADERS = List.of("sku", "name", "brand", "price", "originalPrice", "stock",
            "catalogVisible", "description", "origin", "weightGrip", "weightClass", "balancePoint", "stiffness",
            "maxTension", "playStyle", "frameMaterial", "shaftMaterial", "availableSizes", "gender", "soleType",
            "cushionTechnology", "upperMaterial", "fabricType", "bagType", "capacity", "racketCapacity",
            "waterproof", "accessoryType", "quantityPerPack");
    public record Input(String sheet, int row, ProductDto product, List<String> errors) {}
    private final ObjectMapper mapper;
    public ProductExcelService(ObjectMapper mapper) { this.mapper = mapper; }

    public byte[] template() {
        try (var book = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            for (String name : SHEETS) {
                Sheet sheet = book.createSheet(name);
                Row row = sheet.createRow(0);
                for (int i = 0; i < HEADERS.size(); i++) {
                    row.createCell(i).setCellValue(HEADERS.get(i)); sheet.setColumnWidth(i, 6000);
                }
                sheet.createFreezePane(0, 1);
            }
            book.write(output); return output.toByteArray();
        } catch (IOException ex) { throw new IllegalStateException("Không tạo được mẫu Excel", ex); }
    }

    public List<Input> read(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > 1_000_000) throw new BadRequestException("File Excel phải từ 1 byte đến 1 MB");
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if (book.getNumberOfSheets() > 5) throw new BadRequestException("Chỉ chấp nhận 5 sheet theo mẫu");
            List<Input> result = new ArrayList<>();
            for (Sheet sheet : book) readSheet(sheet, result);
            if (result.isEmpty()) throw new BadRequestException("File chưa có dòng sản phẩm");
            return result;
        } catch (BadRequestException ex) { throw ex; }
        catch (Exception ex) { throw new BadRequestException("Không đọc được file .xlsx hợp lệ theo mẫu"); }
    }

    private void readSheet(Sheet sheet, List<Input> result) {
        int category = SHEETS.indexOf(sheet.getSheetName()) + 1;
        if (category == 0) throw new BadRequestException("Sheet không đúng mẫu: " + sheet.getSheetName());
        if (sheet.getLastRowNum() > 1001) throw new BadRequestException("Mỗi sheet không được vượt 1.000 dòng sản phẩm");
        if (sheet.getRow(0) == null) throw new BadRequestException("Thiếu dòng tiêu đề: " + sheet.getSheetName());
        var formatter = new DataFormatter(Locale.ROOT);
        List<String> headers = new ArrayList<>();
        for (Cell cell : sheet.getRow(0)) headers.add(formatter.formatCellValue(cell).trim());
        if (!headers.equals(HEADERS)) throw new BadRequestException("Sai cột tại sheet " + sheet.getSheetName() + "; hãy tải mẫu mới");
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || empty(row, formatter)) continue;
            if (result.size() >= 1000) throw new BadRequestException("Mỗi file tối đa 1.000 sản phẩm");
            result.add(readRow(sheet.getSheetName(), row, category, formatter));
        }
    }

    private boolean empty(Row row, DataFormatter formatter) {
        for (Cell cell : row) if (!formatter.formatCellValue(cell).isBlank()) return false;
        return true;
    }

    private Input readRow(String sheet, Row row, int category, DataFormatter formatter) {
        Map<String, Object> values = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();
        values.put("categoryId", category);
        for (int i = 0; i < HEADERS.size(); i++) {
            Cell cell = row.getCell(i);
            if (cell == null) continue;
            if (cell.getCellType() == CellType.FORMULA) { errors.add(HEADERS.get(i) + ": không chấp nhận công thức"); continue; }
            String text = formatter.formatCellValue(cell).trim();
            if (!text.isEmpty()) values.put(HEADERS.get(i), text);
        }
        ProductDto product = null;
        try {
            convertOptions(values);
            boolean visible = visibility(values.remove("catalogVisible"));
            product = mapper.convertValue(values, ProductDto.class); product.setCatalogVisible(visible);
        }
        catch (Exception ex) { errors.add("Sai kiểu dữ liệu; giá/tồn phải là số, catalogVisible phải true/false"); }
        return new Input(sheet, row.getRowNum() + 1, product, errors);
    }

    private void convertOptions(Map<String, Object> values) throws IOException {
        Object sizes = values.get("availableSizes");
        if (sizes != null && !sizes.toString().startsWith("[")) {
            values.put("availableSizes", mapper.writeValueAsString(Arrays.stream(sizes.toString().split(","))
                    .map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()));
        }
        if (!values.containsKey("catalogVisible")) values.put("catalogVisible", false);
    }

    private boolean visibility(Object value) {
        String text = String.valueOf(value);
        if (!text.equalsIgnoreCase("true") && !text.equalsIgnoreCase("false")) throw new IllegalArgumentException();
        return Boolean.parseBoolean(text);
    }
}
