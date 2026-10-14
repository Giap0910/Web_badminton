package com.sports.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherDto {
    private Long id;
    @Size(max = 50, message = "Mã voucher tối đa 50 ký tự")
    @Pattern(regexp = "[A-Za-z0-9_-]+", message = "Mã voucher chỉ gồm chữ, số, gạch ngang hoặc gạch dưới")
    private String code;
    @Size(max = 255, message = "Mô tả voucher tối đa 255 ký tự")
    private String description;
    @Pattern(regexp = "(?i)FIXED|PERCENT|SHIPPING", message = "Loại voucher không hợp lệ")
    private String discountType;
    @DecimalMin(value = "0", message = "Giá trị giảm không được âm")
    @DecimalMax(value = "9999999999", message = "Giá trị giảm vượt giới hạn")
    private BigDecimal discountValue;
    @DecimalMin(value = "0", message = "Đơn tối thiểu không được âm")
    @DecimalMax(value = "9999999999", message = "Đơn tối thiểu vượt giới hạn")
    private BigDecimal minOrderValue;
    @DecimalMin(value = "0", message = "Mức giảm tối đa không được âm")
    @DecimalMax(value = "9999999999", message = "Mức giảm tối đa vượt giới hạn")
    private BigDecimal maxDiscountAmount;
    @Min(value = 0, message = "Số lượt sử dụng không được âm")
    private Integer maxUses;
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer usedCount;
    private LocalDateTime expiresAt;
    private Boolean isActive;
    @JsonIgnore private boolean maxDiscountAmountProvided;
    @JsonIgnore private boolean maxUsesProvided;
    @JsonIgnore private boolean expiresAtProvided;

    @JsonSetter("maxDiscountAmount")
    public void setMaxDiscountAmount(BigDecimal value) {
        maxDiscountAmount = value;
        maxDiscountAmountProvided = true;
    }

    @JsonSetter("maxUses")
    public void setMaxUses(Integer value) {
        maxUses = value;
        maxUsesProvided = true;
    }

    @JsonSetter("expiresAt")
    public void setExpiresAt(LocalDateTime value) {
        expiresAt = value;
        expiresAtProvided = true;
    }
}
