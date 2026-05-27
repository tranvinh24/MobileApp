package com.eldercare.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class UpsertHealthEntryRequest {
    private LocalDateTime recordedAt;
    private Integer systolic;
    private Integer diastolic;
    private Integer heartRate;
    private BigDecimal bloodGlucose;
    private BigDecimal temperature;
    private BigDecimal weight;
    private String note;
}

