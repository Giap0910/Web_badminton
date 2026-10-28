package com.sports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    @Size(max=1024,message="Mật khẩu hiện tại quá dài")
    private String currentPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 6,max=72,message = "Mật khẩu mới phải từ 6 đến 72 ký tự và tối đa 72 byte UTF-8")
    private String newPassword;
}
