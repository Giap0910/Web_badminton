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
}
