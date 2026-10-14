package com.sports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private String avatarUrl;
    private java.time.LocalDate dob;
    private String gender;
    private Long loyaltyPoints;
    private java.math.BigDecimal paidProductAmount;
    private String role;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private Integer totalOrders;
    private java.math.BigDecimal totalSpent;
}
