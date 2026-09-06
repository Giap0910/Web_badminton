package com.sports.controller;

import com.sports.dto.AiChatRequest;
import com.sports.dto.AiChatResponse;
import com.sports.security.CustomUserDetails;
import com.sports.service.GeminiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai-chat")
@RequiredArgsConstructor
public class AiChatController {

    private final GeminiService geminiService;

    @PostMapping
    public ResponseEntity<AiChatResponse> chatWithAi(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AiChatRequest request
    ) {
        Long userId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(geminiService.chatWithAi(userId, request));
    }
}
