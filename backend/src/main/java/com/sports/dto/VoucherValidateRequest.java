package com.sports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VoucherValidateRequest {
    public VoucherValidateRequest(String code, BigDecimal orderTotal) {
        this(code, orderTotal, null);
    }
    @NotBlank(message = "Mã voucher không được để trống")
    @Size(max = 50, message = "Mã voucher tối đa 50 ký tự")
    private String code;

    @NotNull(message = "Giá trị đơn hàng không được để trống")
    @DecimalMin(value = "0", message = "Giá trị đơn hàng không được âm")
    @DecimalMax(value = "9999999999", message = "Giá trị đơn hàng vượt giới hạn")
    private BigDecimal orderTotal;

    @Valid
    @Size(min = 1, max = 100, message = "Giỏ hàng phải có từ 1 đến 100 dòng sản phẩm")
    private List<OrderItemRequest> items;
}
