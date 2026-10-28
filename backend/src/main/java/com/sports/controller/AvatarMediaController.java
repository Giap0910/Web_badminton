package com.sports.controller;
import com.sports.service.AvatarStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/media/avatars")
@RequiredArgsConstructor
public class AvatarMediaController {
    private final AvatarStorageService storage;
    private final com.sports.repository.UserRepository users;
    @GetMapping("/{key}") public ResponseEntity<FileSystemResource> image(@PathVariable String key) {
        if (!users.existsByAvatarKey(key)) throw new com.sports.exception.ResourceNotFoundException("Ảnh không còn được sử dụng");
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
                .header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").body(new FileSystemResource(storage.read(key)));
    }
}
