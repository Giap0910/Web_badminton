package com.sports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddressDto {
    private Long id;

    @NotBlank(message = "Họ tên người nhận không được để trống")
    @Size(max = 100, message = "Họ tên không được quá 100 ký tự")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(\\+84|0)[35789][0-9]{8}$", message = "Số điện thoại không đúng định dạng Việt Nam")
    private String phone;

    @NotBlank(message = "Địa chỉ chi tiết không được để trống")
    @Size(max=2000,message="Địa chỉ không được vượt quá 2.000 ký tự")
    private String address;

    @Size(max=100,message="Tên tỉnh thành quá dài") private String province;

    private String provinceCode;
    private String wardCode;
    private String ward;
    @Size(max=2000,message="Địa chỉ cụ thể không được vượt quá 2.000 ký tự") private String addressDetail;
    @Size(max=1000,message="Ghi chú không được vượt quá 1.000 ký tự") private String note;
    @Pattern(regexp="Nhà riêng|Văn phòng|Khác",message="Loại địa chỉ không hợp lệ") private String tag;
    @com.fasterxml.jackson.annotation.JsonIgnore private boolean noteProvided;
    @com.fasterxml.jackson.annotation.JsonIgnore private boolean tagProvided;
    @com.fasterxml.jackson.annotation.JsonSetter("note")
    public void setNote(String note) { this.note=note;this.noteProvided=true; }
    @com.fasterxml.jackson.annotation.JsonSetter("tag")
    public void setTag(String tag) { this.tag=tag;this.tagProvided=true; }


    private Boolean isDefault;

    private LocalDateTime createdAt;
}
