package com.sports.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayOSWebhookRequest {
    private String code;
    private String desc;
    private PayOSWebhookData data;
    private String signature; // HMAC-SHA256 signature generated with checksumKey
}
