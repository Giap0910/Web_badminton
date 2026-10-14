package com.sports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReturnCreateRequest {

    @NotNull(message = "Mã đơn hàng không được để trống")
    private Long orderId;
    @jakarta.validation.constraints.Positive private Long orderItemId;
    @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100) private Integer quantity;
    @jakarta.validation.constraints.Size(max=100) private String serialNumber;

    @NotBlank(message = "Lý do đổi trả / bảo hành không được để trống")
    @jakarta.validation.constraints.Size(max=2000)
    private String reason;

    private String imageUrl;
}
