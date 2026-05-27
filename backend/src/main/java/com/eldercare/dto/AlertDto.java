package com.eldercare.dto;

import com.eldercare.model.Alert;
import com.eldercare.model.enums.AlertType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AlertDto {
    private Long id;
    private Long elderlyId;
    private Long caregiverId;
    private AlertType alertType;
    private String title;
    private String message;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public static AlertDto fromEntity(Alert a) {
        if (a == null) return null;
        return AlertDto.builder()
                .id(a.getId())
                .elderlyId(a.getElderly() != null ? a.getElderly().getId() : null)
                .caregiverId(a.getCaregiver() != null ? a.getCaregiver().getId() : null)
                .alertType(a.getAlertType())
                .title(a.getTitle())
                .message(a.getMessage())
                .latitude(a.getLatitude())
                .longitude(a.getLongitude())
                .isRead(a.getIsRead())
                .createdAt(a.getCreatedAt())
                .build();
    }
}

