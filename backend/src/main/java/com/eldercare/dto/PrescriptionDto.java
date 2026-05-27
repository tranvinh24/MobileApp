package com.eldercare.dto;

import com.eldercare.model.Medication;
import com.eldercare.model.MedicationSchedule;
import com.eldercare.model.Prescription;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
public class PrescriptionDto {
    private Long id;
    private Long elderlyId;
    private String title;
    private String doctorName;
    private String notes;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long createdById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<MedicationDto> medications;

    @Data
    @Builder
    public static class MedicationDto {
        private Long id;
        private String name;
        private String dosage;
        private String unit;
        private Integer quantity;
        private String instructions;
        private List<ScheduleDto> schedules;

        public static MedicationDto fromEntity(Medication m) {
            if (m == null) return null;
            List<ScheduleDto> sch = (m.getSchedules() == null) ? List.of()
                    : m.getSchedules().stream().map(ScheduleDto::fromEntity).toList();
            return MedicationDto.builder()
                    .id(m.getId())
                    .name(m.getName())
                    .dosage(m.getDosage())
                    .unit(m.getUnit())
                    .quantity(m.getQuantity())
                    .instructions(m.getInstructions())
                    .schedules(sch)
                    .build();
        }
    }

    @Data
    @Builder
    public static class ScheduleDto {
        private Long id;
        private LocalTime timeOfDay;
        private String dayOfWeek;
        private Boolean isActive;
        private Integer reminderMinutesBefore;
        private LocalDateTime createdAt;

        public static ScheduleDto fromEntity(MedicationSchedule s) {
            if (s == null) return null;
            return ScheduleDto.builder()
                    .id(s.getId())
                    .timeOfDay(s.getTimeOfDay())
                    .dayOfWeek(s.getDayOfWeek())
                    .isActive(s.getIsActive())
                    .reminderMinutesBefore(s.getReminderMinutesBefore())
                    .createdAt(s.getCreatedAt())
                    .build();
        }
    }

    public static PrescriptionDto fromEntity(Prescription p) {
        if (p == null) return null;
        List<MedicationDto> meds = (p.getMedications() == null) ? List.of()
                : p.getMedications().stream().map(MedicationDto::fromEntity).toList();
        return PrescriptionDto.builder()
                .id(p.getId())
                .elderlyId(p.getElderly() != null ? p.getElderly().getId() : null)
                .title(p.getTitle())
                .doctorName(p.getDoctorName())
                .notes(p.getNotes())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .createdById(p.getCreatedBy() != null ? p.getCreatedBy().getId() : null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .medications(meds)
                .build();
    }
}

