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
    public static final List<String> LEGACY_HEADERS = List.of("sku", "name", "brand", "price", "originalPrice", "stock",
            "catalogVisible", "description", "origin", "weightGrip", "weightClass", "balancePoint", "stiffness",
            "maxTension", "playStyle", "frameMaterial", "shaftMaterial", "availableSizes", "gender", "soleType",
            "cushionTechnology", "upperMaterial", "fabricType", "bagType", "capacity", "racketCapacity",
            "waterproof", "accessoryType", "quantityPerPack");
    public static final List<String> VARIANT_HEADERS = List.of("manufacturerCode", "colorName", "edition", "specificationSource",
            "variantColor", "variantSize", "variantWeightGrip", "variantPackaging", "variantStock");
    public static final List<String> HEADERS = java.util.stream.Stream.concat(LEGACY_HEADERS.stream(),VARIANT_HEADERS.stream()).toList();
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
            return groupInputs(result);
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
        if (!headers.equals(HEADERS) && !headers.equals(LEGACY_HEADERS)) throw new BadRequestException("Sai cột tại sheet " + sheet.getSheetName() + "; hãy tải mẫu mới");
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || empty(row, formatter)) continue;
            if (result.size() >= 1000) throw new BadRequestException("Mỗi file tối đa 1.000 sản phẩm");
            result.add(readRow(sheet.getSheetName(), row, category, formatter, headers));
        }
    }

    private boolean empty(Row row, DataFormatter formatter) {
        for (Cell cell : row) if (!formatter.formatCellValue(cell).isBlank()) return false;
        return true;
    }

    private Input readRow(String sheet, Row row, int category, DataFormatter formatter, List<String> headers) {
        List<String> errors = new ArrayList<>();
        Map<String, Object> values = readCells(row, formatter, headers, errors);
        values.put("categoryId", category);
        ProductDto product = null;
        try {
            convertOptions(values);
            boolean visible = visibility(values.remove("catalogVisible"));
            var variant = readVariant(values);
            product = mapper.convertValue(values, ProductDto.class); product.setCatalogVisible(visible);
            if (variant != null) { product.setVariants(new ArrayList<>(List.of(variant))); product.setStock(variant.getStock()); }
        }
        catch (Exception ex) { errors.add("Sai kiểu dữ liệu; giá/tồn phải là số, catalogVisible phải true/false"); }
        return new Input(sheet, row.getRowNum() + 1, product, errors);
    }

    private Map<String,Object> readCells(Row row,DataFormatter formatter,List<String> headers,List<String> errors) {
        Map<String,Object> values=new LinkedHashMap<>();
        for (int i=0;i<headers.size();i++) {
            Cell cell=row.getCell(i);if (cell==null) continue;
            String header=headers.get(i);
            if (cell.getCellType()==CellType.FORMULA) { errors.add(header+": không chấp nhận công thức");continue; }
            boolean numeric=List.of("price","originalPrice","stock","variantStock","racketCapacity").contains(header);
            String text=numeric && cell.getCellType()==CellType.NUMERIC ? java.math.BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString()
                    : formatter.formatCellValue(cell).trim();
            if (!text.isBlank()) values.put(header,text);
        }
        return values;
    }

    private com.sports.dto.ProductVariantDto readVariant(Map<String,Object> values) {
        boolean present = values.keySet().stream().anyMatch(k -> k.startsWith("variant"));
        if (!present) return null;
        String color=(String)values.remove("variantColor"), size=(String)values.remove("variantSize");
        String weight=(String)values.remove("variantWeightGrip"), packaging=(String)values.remove("variantPackaging");
        Object stock=values.remove("variantStock");
        if (stock == null) stock=values.get("stock");
        return com.sports.dto.ProductVariantDto.builder().color(color).size(size).weightGrip(weight).packaging(packaging)
                .stock(Integer.valueOf(String.valueOf(stock))).active(true).build();
    }

    private List<Input> groupInputs(List<Input> inputs) {
        Map<String,Input> grouped = new LinkedHashMap<>();
        for (Input row : inputs) {
            if (row.product() == null || row.product().getVariants() == null) { grouped.put(UUID.randomUUID().toString(),row); continue; }
            String key=row.product().getCategoryId()+":"+String.valueOf(row.product().getSku()).toLowerCase(Locale.ROOT);
            var previous=grouped.get(key);
            grouped.put(key,previous == null ? row : mergeInput(previous,row));
        }
        for (Input row : grouped.values()) completeVariants(row.product());
        return new ArrayList<>(grouped.values());
    }

    private Input mergeInput(Input previous, Input row) {
        List<String> errors=new ArrayList<>(previous.errors());errors.addAll(row.errors());
        var first=mapper.convertValue(previous.product(),Map.class);var second=mapper.convertValue(row.product(),Map.class);
        for (String key : List.of("variants","stock","availableSizes","colorName")) { first.remove(key);second.remove(key); }
        if (!first.equals(second)) errors.add("Dòng "+row.row()+": thông tin chung của cùng SKU không thống nhất");
        previous.product().getVariants().addAll(row.product().getVariants());
        return new Input(previous.sheet(),previous.row(),previous.product(),errors);
    }

    private void completeVariants(ProductDto product) {
        if (product == null || product.getVariants() == null) return;
        product.setStock(product.getVariants().stream().mapToInt(com.sports.dto.ProductVariantDto::getStock).sum());
        var sizes=product.getVariants().stream().map(com.sports.dto.ProductVariantDto::getSize).filter(Objects::nonNull).distinct().toList();
        if (!sizes.isEmpty()) try { product.setAvailableSizes(mapper.writeValueAsString(sizes)); }
        catch(IOException ex) { throw new IllegalStateException(ex); }
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
