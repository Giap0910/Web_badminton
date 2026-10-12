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
    private String fullName;

    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    private String phone;

    private String address;
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
