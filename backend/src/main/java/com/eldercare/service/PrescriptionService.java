package com.eldercare.service;

import com.eldercare.model.*;
import com.eldercare.repository.MedicationRepository;
import com.eldercare.repository.MedicationScheduleRepository;
import com.eldercare.repository.PrescriptionRepository;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationScheduleRepository scheduleRepository;
    private final UserRepository userRepository;

    public Prescription create(Prescription prescription, Long createdById) {
        User creator = userRepository.findById(createdById).orElse(null);
        prescription.setCreatedBy(creator);
        return prescriptionRepository.save(prescription);
    }

    public Prescription update(Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }

    public void delete(Long id) {
        prescriptionRepository.deleteById(id);
    }

    public Prescription findById(Long id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn thuốc"));
    }

    public List<Prescription> findByElderlyId(Long elderlyId) {
        User elderly = userRepository.findById(elderlyId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi"));
        return prescriptionRepository.findByElderlyOrderByCreatedAtDesc(elderly);
    }

    @Transactional
    public Medication addMedication(Long prescriptionId, Medication medication) {
        Prescription prescription = findById(prescriptionId);
        medication.setPrescription(prescription);
        return medicationRepository.save(medication);
    }

    @Transactional
    public MedicationSchedule addSchedule(Long medicationId, LocalTime timeOfDay, Integer reminderMinutes) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thuốc"));
        MedicationSchedule schedule = MedicationSchedule.builder()
                .medication(medication)
                .timeOfDay(timeOfDay)
                .dayOfWeek("ALL")
                .reminderMinutesBefore(reminderMinutes != null ? reminderMinutes : 15)
                .isActive(true)
                .build();
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public Medication updateMedication(Long medicationId, Medication updates) {
        Medication m = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thuốc"));
        if (updates.getName() != null) m.setName(updates.getName());
        if (updates.getDosage() != null) m.setDosage(updates.getDosage());
        if (updates.getUnit() != null) m.setUnit(updates.getUnit());
        if (updates.getQuantity() != null) m.setQuantity(updates.getQuantity());
        if (updates.getInstructions() != null) m.setInstructions(updates.getInstructions());
        return medicationRepository.save(m);
    }

    @Transactional
    public void deleteMedication(Long medicationId) {
        medicationRepository.deleteById(medicationId);
    }

    @Transactional
    public MedicationSchedule updateSchedule(Long scheduleId, LocalTime timeOfDay, Integer reminderMinutesBefore, Boolean isActive) {
        MedicationSchedule s = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch uống"));
        if (timeOfDay != null) s.setTimeOfDay(timeOfDay);
        if (reminderMinutesBefore != null) s.setReminderMinutesBefore(reminderMinutesBefore);
        if (isActive != null) s.setIsActive(isActive);
        return scheduleRepository.save(s);
    }

    @Transactional
    public void deleteSchedule(Long scheduleId) {
        scheduleRepository.deleteById(scheduleId);
    }
}
