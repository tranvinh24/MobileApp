package com.eldercare.dto;

import com.eldercare.model.Medication;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MedicationDto {
    private Long id;
    private Long prescriptionId;
    private String name;
    private String dosage;
    private String unit;
    private Integer quantity;
    private String instructions;

    public static MedicationDto fromEntity(Medication m) {
        if (m == null) return null;
        return MedicationDto.builder()
                .id(m.getId())
                .prescriptionId(m.getPrescription() != null ? m.getPrescription().getId() : null)
                .name(m.getName())
                .dosage(m.getDosage())
                .unit(m.getUnit())
                .quantity(m.getQuantity())
                .instructions(m.getInstructions())
                .build();
    }
}

