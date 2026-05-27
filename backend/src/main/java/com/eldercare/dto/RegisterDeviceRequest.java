package com.eldercare.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterDeviceRequest {
    @NotBlank(message = "Thiếu token")
    private String token;
    private String platform;
    private String deviceInfo;
}

