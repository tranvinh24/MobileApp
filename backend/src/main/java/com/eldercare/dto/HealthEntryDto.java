package com.eldercare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthEntryDto {
    private Long id;
    private Long elderlyId;
    private Long recordedBy;
    private String recordedByName;
    private String recordedAt;
    private Integer systolic;
    private Integer diastolic;
    private Integer heartRate;
    private String bloodGlucose;
    private String temperature;
    private String weight;
    private String note;
}

