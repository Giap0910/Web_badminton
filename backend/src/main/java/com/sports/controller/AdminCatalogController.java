package com.sports.controller;

import com.sports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController @RequestMapping("/api/admin/products") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminCatalogController {
    private final ProductExcelService excel;
    private final ProductImportService imports;

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=product-import-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(excel.template());
    }

    @PostMapping(value = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductImportService.Result preview(@RequestParam MultipartFile file) throws IOException { return imports.preview(file.getBytes()); }

    @PostMapping(value = "/import/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductImportService.Result commit(@RequestParam MultipartFile file, @RequestParam String sha256) throws IOException {
        return imports.commit(file.getBytes(), sha256);
    }
}
