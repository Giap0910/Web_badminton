package com.sports.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatResponse {
    private String reply;
    private String provider;
    private String model;
    private boolean fallback;
    @Builder.Default
    private List<Long> recommendedProductIds = new ArrayList<>();
    @Builder.Default
    private List<ProductDto> recommendedProducts = new ArrayList<>();
}
