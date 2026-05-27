package com.eldercare.dto;

import com.eldercare.model.CheckIn;
import com.eldercare.model.enums.CheckInType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CheckInDto {
    private Long id;
    private Long elderlyId;
    private CheckInType checkInType;
    private LocalDateTime checkedAt;
    private String notes;
    private BigDecimal latitude;
    private BigDecimal longitude;

    public static CheckInDto fromEntity(CheckIn c) {
        if (c == null) return null;
        return CheckInDto.builder()
                .id(c.getId())
                .elderlyId(c.getElderly() != null ? c.getElderly().getId() : null)
                .checkInType(c.getCheckInType())
                .checkedAt(c.getCheckedAt())
                .notes(c.getNotes())
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .build();
    }
}

