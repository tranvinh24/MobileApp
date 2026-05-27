package com.eldercare.dto;

import com.eldercare.model.MedicationHistory;
import com.eldercare.model.enums.MedicationHistoryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MedicationHistoryDto {
    private Long id;
    private Long medicationScheduleId;
    private LocalDateTime scheduledTime;
    private LocalDateTime takenAt;
    private LocalDateTime remindedAt;
    private MedicationHistoryStatus status;
    private String notes;

    public static MedicationHistoryDto fromEntity(MedicationHistory h) {
        if (h == null) return null;
        return MedicationHistoryDto.builder()
                .id(h.getId())
                .medicationScheduleId(h.getMedicationSchedule() != null ? h.getMedicationSchedule().getId() : null)
                .scheduledTime(h.getScheduledTime())
                .takenAt(h.getTakenAt())
                .remindedAt(h.getRemindedAt())
                .status(h.getStatus())
                .notes(h.getNotes())
                .build();
    }
}

