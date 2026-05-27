package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.dto.MedicationDto;
import com.eldercare.dto.MedicationScheduleDto;
import com.eldercare.dto.PrescriptionDto;
import com.eldercare.model.Medication;
import com.eldercare.model.MedicationSchedule;
import com.eldercare.model.Prescription;
import com.eldercare.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @GetMapping("/elderly/{elderlyId}")
    public ResponseEntity<ApiResponse<List<PrescriptionDto>>> getByElderly(@PathVariable Long elderlyId) {
        List<Prescription> list = prescriptionService.findByElderlyId(elderlyId);
        return ResponseEntity.ok(ApiResponse.success(list.stream().map(PrescriptionDto::fromEntity).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionDto>> getById(@PathVariable Long id) {
        Prescription p = prescriptionService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(PrescriptionDto.fromEntity(p)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PrescriptionDto>> create(@RequestBody Prescription prescription,
                                                               @RequestParam Long createdBy) {
        Prescription saved = prescriptionService.create(prescription, createdBy);
        return ResponseEntity.ok(ApiResponse.success(PrescriptionDto.fromEntity(saved)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionDto>> update(@PathVariable Long id, @RequestBody Prescription body) {
        Prescription existing = prescriptionService.findById(id);
        body.setId(existing.getId());
        body.setElderly(existing.getElderly());
        Prescription saved = prescriptionService.update(body);
        return ResponseEntity.ok(ApiResponse.success(PrescriptionDto.fromEntity(saved)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable Long id) {
        prescriptionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa", "OK"));
    }

    @PostMapping("/{prescriptionId}/medications")
    public ResponseEntity<ApiResponse<MedicationDto>> addMedication(@PathVariable Long prescriptionId,
                                                                    @RequestBody Medication medication) {
        Medication saved = prescriptionService.addMedication(prescriptionId, medication);
        return ResponseEntity.ok(ApiResponse.success(MedicationDto.fromEntity(saved)));
    }

    @PostMapping("/medications/{medicationId}/schedules")
    public ResponseEntity<ApiResponse<MedicationScheduleDto>> addSchedule(@PathVariable Long medicationId,
                                                                          @RequestBody Map<String, Object> body) {
        String timeStr = (String) body.get("timeOfDay"); // "08:00"
        Integer reminder = body.get("reminderMinutesBefore") != null
                ? (Integer) body.get("reminderMinutesBefore") : 15;
        LocalTime time = LocalTime.parse(timeStr != null ? timeStr : "08:00");
        MedicationSchedule schedule = prescriptionService.addSchedule(medicationId, time, reminder);
        return ResponseEntity.ok(ApiResponse.success(MedicationScheduleDto.fromEntity(schedule)));
    }

    @PutMapping("/medications/{medicationId}")
    public ResponseEntity<ApiResponse<MedicationDto>> updateMedication(
            @PathVariable Long medicationId,
            @RequestBody Medication body
    ) {
        Medication saved = prescriptionService.updateMedication(medicationId, body);
        return ResponseEntity.ok(ApiResponse.success(MedicationDto.fromEntity(saved)));
    }

    @DeleteMapping("/medications/{medicationId}")
    public ResponseEntity<ApiResponse<String>> deleteMedication(@PathVariable Long medicationId) {
        prescriptionService.deleteMedication(medicationId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa", "OK"));
    }

    @PutMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<MedicationScheduleDto>> updateSchedule(
            @PathVariable Long scheduleId,
            @RequestBody Map<String, Object> body
    ) {
        String timeStr = body.get("timeOfDay") != null ? body.get("timeOfDay").toString() : null;
        Integer reminder = body.get("reminderMinutesBefore") != null
                ? Integer.valueOf(body.get("reminderMinutesBefore").toString()) : null;
        Boolean isActive = body.get("isActive") != null ? Boolean.valueOf(body.get("isActive").toString()) : null;
        LocalTime time = timeStr != null ? LocalTime.parse(timeStr) : null;
        MedicationSchedule saved = prescriptionService.updateSchedule(scheduleId, time, reminder, isActive);
        return ResponseEntity.ok(ApiResponse.success(MedicationScheduleDto.fromEntity(saved)));
    }

    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<String>> deleteSchedule(@PathVariable Long scheduleId) {
        prescriptionService.deleteSchedule(scheduleId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa", "OK"));
    }
}
