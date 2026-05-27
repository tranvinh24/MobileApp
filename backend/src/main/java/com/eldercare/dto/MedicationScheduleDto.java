package com.eldercare.dto;

import com.eldercare.model.MedicationSchedule;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
public class MedicationScheduleDto {
    private Long id;
    private Long medicationId;
    private LocalTime timeOfDay;
    private String dayOfWeek;
    private Boolean isActive;
    private Integer reminderMinutesBefore;
    private LocalDateTime createdAt;

    public static MedicationScheduleDto fromEntity(MedicationSchedule s) {
        if (s == null) return null;
        return MedicationScheduleDto.builder()
                .id(s.getId())
                .medicationId(s.getMedication() != null ? s.getMedication().getId() : null)
                .timeOfDay(s.getTimeOfDay())
                .dayOfWeek(s.getDayOfWeek())
                .isActive(s.getIsActive())
                .reminderMinutesBefore(s.getReminderMinutesBefore())
                .createdAt(s.getCreatedAt())
                .build();
    }
}

