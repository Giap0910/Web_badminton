package com.sports.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuthRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @jakarta.validation.constraints.Size(max=100,message="Tên đăng nhập hoặc email quá dài")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @jakarta.validation.constraints.Size(max=1024,message="Mật khẩu quá dài")
    private String password;
}
