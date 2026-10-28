package com.sports.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductCatalogFilters {
    @Size(max = 100)
    private String productSize;
    @Size(max = 100)
    private String gender;
    @Size(max = 100)
    private String bagType;
    @Size(max = 100)
    private String accessoryType;
    @Min(0)
    private Integer racketCapacity;
    private Boolean sale;
}
