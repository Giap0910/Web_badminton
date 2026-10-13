package com.sports.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.entity.Product;
import com.sports.repository.*;
import jakarta.validation.Validation;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import java.io.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductExcelFlowTest {
    private final ProductExcelService excel = new ProductExcelService(new ObjectMapper());

    private byte[] file(String sku, String visible, boolean formula) throws Exception {
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(excel.template())); var out = new ByteArrayOutputStream()) {
            var row = book.getSheetAt(4).createRow(1);
            Map<String, String> fields = Map.of("sku", sku, "name", "Cước Yonex BG Test", "brand", "Yonex",
                    "price", "100000", "stock", "20", "catalogVisible", visible, "accessoryType", "day_cuoc", "quantityPerPack", "10 m");
            fields.forEach((key, value) -> row.createCell(ProductExcelService.HEADERS.indexOf(key)).setCellValue(value));
            if (formula) row.getCell(3).setCellFormula("1+1");
            book.write(out); return out.toByteArray();
        }
    }

    private ProductImportService imports(ProductRepository repository, ProductService products) {
        var categories = mock(CategoryRepository.class);
        when(categories.existsById(5L)).thenReturn(true);
        return new ProductImportService(excel, products, repository, categories, Validation.buildDefaultValidatorFactory().getValidator());
    }

    @Test void actualWorkbookReadsFiveSheetsAndPreservesVisibilityAndStock() throws Exception {
        var rows = excel.read(file("TEST-EXCEL-1", "false", false));
        assertEquals(1, rows.size()); assertEquals(5L, rows.get(0).product().getCategoryId());
        assertEquals(false, rows.get(0).product().getCatalogVisible()); assertEquals(20, rows.get(0).product().getStock());
        assertEquals(new BigDecimal("100000"), rows.get(0).product().getPrice());
        assertTrue(rows.get(0).errors().isEmpty());
    }

    @Test void formulasAndExistingSkusAreReportedWithoutAnyWrite() throws Exception {
        var repository = mock(ProductRepository.class); var products = mock(ProductService.class);
        when(repository.findAll()).thenReturn(List.of(Product.builder().sku("test-excel-1").build()));
        var result = imports(repository, products).preview(file("TEST-EXCEL-1", "true", true));
        assertFalse(result.valid()); assertTrue(result.rows().get(0).errors().stream().anyMatch(error -> error.contains("công thức")));
        assertTrue(result.rows().get(0).errors().stream().anyMatch(error -> error.contains("sku")));
        verifyNoInteractions(products);
    }

    @Test void modifiedFileCannotBeCommittedUsingPreviousPreviewHash() throws Exception {
        var products = mock(ProductService.class); var service = imports(mock(ProductRepository.class), products);
        byte[] bytes = file("TEST-EXCEL-2", "false", false);
        assertThrows(com.sports.exception.BadRequestException.class, () -> service.commit(bytes, "wrong-hash"));
        verifyNoInteractions(products);
    }

    @Test void malformedWorkbookOrEmptyTemplateIsRejected() {
        assertThrows(com.sports.exception.BadRequestException.class, () -> excel.read(new byte[]{1, 2, 3}));
        assertThrows(com.sports.exception.BadRequestException.class, () -> excel.read(excel.template()));
    }

    private byte[] variantsFile(boolean inconsistent, boolean duplicate) throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(excel.template()));var out=new ByteArrayOutputStream()) {
            var style=book.createCellStyle();style.setDataFormat(book.createDataFormat().getFormat("#,##0"));
            for(int i=1;i<=2;i++) {
                var row=book.getSheetAt(4).createRow(i);
                var fields=Map.of("sku","HG-ACCESSORY-TEST001","name","Cước Yonex BG6","brand","Yonex",
                        "stock","20","catalogVisible","false","accessoryType","day_cuoc","quantityPerPack","10 m",
                        "variantColor",i==1||duplicate?"Trắng":"Đỏ","variantStock","20");
                fields.forEach((key,value)->row.createCell(ProductExcelService.HEADERS.indexOf(key)).setCellValue(value));
                var price=row.createCell(ProductExcelService.HEADERS.indexOf("price"));price.setCellValue(inconsistent&&i==2?120000:100000);price.setCellStyle(style);
            }
            book.write(out);return out.toByteArray();
        }
    }
    @Test void variantRowsGroupOneProductAndReadFormattedNumericPrices() throws Exception {
        var rows=excel.read(variantsFile(false,false));
        assertEquals(1,rows.size());assertTrue(rows.get(0).errors().isEmpty());
        assertEquals(2,rows.get(0).product().getVariants().size());
        assertEquals(40,rows.get(0).product().getStock());
        assertEquals(new BigDecimal("100000"),rows.get(0).product().getPrice());
    }
    @Test void conflictingCommonDataOrRepeatedVariantBlocksTheEntireImport() throws Exception {
        var repository=mock(ProductRepository.class);var products=mock(ProductService.class);
        var imports=imports(repository,products);
        assertFalse(imports.preview(variantsFile(true,false)).valid());
        assertFalse(imports.preview(variantsFile(false,true)).valid());
        var bytes=variantsFile(false,true);
        assertThrows(com.sports.exception.BadRequestException.class,()->imports.commit(bytes,imports.preview(bytes).sha256()));
        verifyNoInteractions(products);
    }
    @Test void oldSkuAliasPreventsReimportAfterHgSkuMigration() throws Exception {
        var repository=mock(ProductRepository.class);var products=mock(ProductService.class);
        when(repository.findAll()).thenReturn(List.of(Product.builder().sku("HG-ACCESSORY-101").legacySku("TEST-EXCEL-1").build()));
        assertFalse(imports(repository,products).preview(file("TEST-EXCEL-1","false",false)).valid());
        verifyNoInteractions(products);
    }
    @Test void legacyTwentyNineColumnWorkbookIsStillAccepted() throws Exception {
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
            var sheet=book.createSheet("Phụ kiện");var header=sheet.createRow(0);
            for(int i=0;i<ProductExcelService.LEGACY_HEADERS.size();i++)header.createCell(i).setCellValue(ProductExcelService.LEGACY_HEADERS.get(i));
            var row=sheet.createRow(1);
            Map.of("sku","OLD-TEST-1","name","Cước Yonex","brand","Yonex","price","100000","stock","20")
                    .forEach((key,value)->row.createCell(ProductExcelService.LEGACY_HEADERS.indexOf(key)).setCellValue(value));
            book.write(out);
            assertEquals(20,excel.read(out.toByteArray()).get(0).product().getStock());
        }
    }
}
