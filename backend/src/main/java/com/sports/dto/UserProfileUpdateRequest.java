package com.sports.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileUpdateRequest {

    @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự")
    @jakarta.validation.constraints.Pattern(regexp="(?s).*\\S.*",message="Họ tên không được để trống")
    private String fullName;

    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    @jakarta.validation.constraints.Pattern(regexp="^$|^(\\+84|0)[35789][0-9]{8}$",message="Số điện thoại không đúng định dạng Việt Nam")
    private String phone;

    @Size(max=2000,message="Địa chỉ không được vượt quá 2.000 ký tự") private String address;
    @jakarta.validation.constraints.Pattern(regexp="nam|nu|khac",message="Giới tính không hợp lệ")
    private String gender;
    @com.fasterxml.jackson.annotation.JsonIgnore private boolean genderProvided;
    @com.fasterxml.jackson.annotation.JsonSetter("gender")
    public void setGender(String gender) { this.gender=gender;this.genderProvided=true; }
    @jakarta.validation.constraints.PastOrPresent(message = "Ngày sinh không được ở tương lai")
    private java.time.LocalDate dob;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private boolean dobProvided;
    @com.fasterxml.jackson.annotation.JsonSetter("dob")
    public void setDob(java.time.LocalDate dob) { this.dob = dob; this.dobProvided = true; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    @jakarta.validation.constraints.AssertTrue(message = "Năm sinh phải từ 1000 trở đi")
    public boolean isDobSupported() { return dob == null || dob.getYear() >= 1000; }

}
