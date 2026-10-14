package com.sports.controller;

import com.sports.dto.UserProfileResponse;
import com.sports.service.UserService;
import com.sports.security.CustomUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestParam boolean active,
            @AuthenticationPrincipal CustomUserDetails administrator
    ) {
        if (administrator==null) throw new com.sports.exception.BadRequestException("Không thể xác minh quản trị viên");
        if (!active && java.util.Objects.equals(id,administrator.getId()))
            throw new com.sports.exception.BadRequestException("Không thể tự khóa tài khoản quản trị viên đang sử dụng");
        return ResponseEntity.ok(userService.updateUserStatus(id, active));
    }
}
