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
    private final ProductImageAdminService productImages;
    private final ProductService products;

    @PostMapping("/drafts")
    public ResponseEntity<com.sports.dto.ProductDto> draft(@jakarta.validation.Valid @RequestBody com.sports.dto.ProductDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(products.createDraft(dto));
    }

    @GetMapping("/{id}/images")
    public java.util.List<com.sports.dto.ProductGallerySlotDto> images(@PathVariable long id) {
        return productImages.list(id);
    }

    @PutMapping(value = "/{id}/images/{position}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public java.util.List<com.sports.dto.ProductGallerySlotDto> upload(@PathVariable long id, @PathVariable int position,
            @RequestParam MultipartFile file, @RequestParam boolean approved) {
        return productImages.replace(id, position, file, approved);
    }

    @GetMapping("/{id}/images/{position}/content")
    public ResponseEntity<byte[]> preview(@PathVariable long id, @PathVariable int position) {
        var asset = productImages.preview(id, position);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.contentType()))
                .header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
                .body(asset.bytes());
    }

    @PostMapping("/{id}/publish")
    public com.sports.dto.ProductDto publish(@PathVariable long id) {
        return productImages.publish(id);
    }

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
