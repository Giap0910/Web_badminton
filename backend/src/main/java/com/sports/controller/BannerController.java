package com.sports.controller;

import com.sports.service.BannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController @RequiredArgsConstructor
public class BannerController {
    private final BannerService banners;

    @GetMapping("/api/banners")
    public ResponseEntity<List<BannerService.Slot>> list() {
        return ResponseEntity.ok().header("Cache-Control", "no-cache").body(banners.list());
    }

    @PutMapping(value = "/api/admin/banners/{position}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public BannerService.Slot upload(@PathVariable int position, @RequestParam MultipartFile file,
            @RequestParam boolean approved) {
        return banners.replace(position, file, approved);
    }

    @GetMapping("/api/media/banners/{position}/{fileName}")
    public ResponseEntity<byte[]> image(@PathVariable int position, @PathVariable String fileName) {
        var asset = banners.read(position, fileName);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.contentType()))
                .header("Cache-Control", "no-cache").header("X-Content-Type-Options", "nosniff")
                .contentLength(asset.bytes().length).body(asset.bytes());
    }
}
