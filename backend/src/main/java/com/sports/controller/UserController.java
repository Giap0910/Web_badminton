package com.sports.controller;

import com.sports.dto.ChangePasswordRequest;
import com.sports.dto.UserProfileResponse;
import com.sports.dto.UserProfileUpdateRequest;
import com.sports.security.CustomUserDetails;
import com.sports.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateUserProfile(userDetails.getId(), request));
    }

    @PostMapping(value = "/profile/avatar", consumes = "multipart/form-data")
    public UserProfileResponse uploadAvatar(@AuthenticationPrincipal CustomUserDetails user,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return userService.uploadAvatar(user.getId(), file);
    }
    @DeleteMapping("/profile/avatar")
    public UserProfileResponse deleteAvatar(@AuthenticationPrincipal CustomUserDetails user) {
        return userService.deleteAvatar(user.getId());
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(userDetails.getId(), request);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
    }
}
