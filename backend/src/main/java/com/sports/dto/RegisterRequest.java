package com.sports.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    private String username;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Size(max=100,message="Email không được vượt quá 100 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6,max=72, message = "Mật khẩu phải từ 6 đến 72 ký tự và tối đa 72 byte UTF-8")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max=100,message="Họ tên không được vượt quá 100 ký tự")
    private String fullName;

    @jakarta.validation.constraints.Pattern(regexp="^$|^(\\+84|0)[35789][0-9]{8}$",message="Số điện thoại không đúng định dạng Việt Nam")
    private String phone;
    @Size(max=2000,message="Địa chỉ không được vượt quá 2.000 ký tự") private String address;
}
