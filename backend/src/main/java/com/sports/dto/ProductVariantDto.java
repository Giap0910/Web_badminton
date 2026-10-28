package com.sports.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductVariantDto {
    private Long id;
    @Size(max = 100) private String sku;
    @Size(max = 200) private String color;
    @Size(max = 50) private String size;
    @Size(max = 50) private String weightGrip;
    @Size(max = 100) private String packaging;
    @Min(value = 0, message = "Tồn biến thể không được âm") @Max(value = 1000000, message = "Tồn biến thể tối đa 1.000.000") private Integer stock;
    @Min(0) private Integer expectedStock;
    private Integer reservedStock;
    private Boolean active;
    private Boolean legacy;
    private Boolean inStock;
    @JsonIgnore @Setter(AccessLevel.NONE) private boolean colorSupplied;
    @JsonIgnore @Setter(AccessLevel.NONE) private boolean sizeSupplied;
    @JsonIgnore @Setter(AccessLevel.NONE) private boolean weightGripSupplied;
    @JsonIgnore @Setter(AccessLevel.NONE) private boolean packagingSupplied;
    @JsonSetter("color") public void setColor(String value) { color=value;colorSupplied=true; }
    @JsonSetter("size") public void setSize(String value) { size=value;sizeSupplied=true; }
    @JsonSetter("weightGrip") public void setWeightGrip(String value) { weightGrip=value;weightGripSupplied=true; }
    @JsonSetter("packaging") public void setPackaging(String value) { packaging=value;packagingSupplied=true; }
    @JsonGetter("stock") public Integer publicStock() { return administrator() ? stock : null; }
    @JsonGetter("reservedStock") public Integer publicReservedStock() { return administrator() ? reservedStock : null; }
    private boolean administrator() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
