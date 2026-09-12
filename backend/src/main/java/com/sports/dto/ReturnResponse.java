package com.sports.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnResponse {
    private Long id;
    private Long orderId;
    private Long userId;
    private String userFullName;
    private String reason;
    private String imageUrl;
    private String status;
    private String adminNote;
    private LocalDateTime createdAt;
}
