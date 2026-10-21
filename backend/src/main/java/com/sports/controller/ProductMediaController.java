package com.sports.controller;

import com.sports.service.ProductMediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media/products")
@RequiredArgsConstructor
public class ProductMediaController {
    private final ProductMediaService media;

    @GetMapping("/{productId}/{fileName}")
    public ResponseEntity<byte[]> image(@PathVariable Long productId, @PathVariable String fileName) {
        var asset = media.read(productId, fileName);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.contentType()))
                .contentLength(asset.bytes().length).header("Cache-Control", "no-cache")
                .header("X-Content-Type-Options", "nosniff").body(asset.bytes());
    }
}
