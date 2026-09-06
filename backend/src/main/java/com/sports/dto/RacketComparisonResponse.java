package com.sports.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RacketComparisonResponse {
    private List<ProductDto> rackets;
    private List<String> comparisonAttributes;
}
