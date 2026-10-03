package com.sports.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateRequest {
    @NotEmpty(message = "Danh sách sản phẩm không được rỗng")
    @Size(max = 100)
    @Valid
    private List<@NotNull OrderItemRequest> items;

    @NotBlank(message = "Tên người nhận không được để trống")
    @Size(max = 100)
    private String customerName;

    @NotBlank(message = "Số điện thoại nhận hàng không được để trống")
    @Size(max = 20)
    @Pattern(regexp = "^(\\+84|0)[35789][0-9]{8}$")
    private String shippingPhone;

    @NotBlank(message = "Địa chỉ nhận hàng không được để trống")
    private String shippingAddress;

    @Size(max = 50)
    private String paymentMethod; // "PAYOS_VIETQR" hoặc "COD"

    @Size(max = 50)
    private String voucherCode;

    @DecimalMin("0") @DecimalMax("9999999999") @Digits(integer = 10, fraction = 0)
    private BigDecimal shippingFee;

    @Size(max = 2000)
    private String note;
}
