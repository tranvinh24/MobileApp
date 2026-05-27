package com.eldercare.repository;

import com.eldercare.model.Medication;
import com.eldercare.model.MedicationSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationScheduleRepository extends JpaRepository<MedicationSchedule, Long> {

    List<MedicationSchedule> findByMedication(Medication medication);

    List<MedicationSchedule> findByMedicationIdAndIsActiveTrue(Long medicationId);

    List<MedicationSchedule> findByIsActiveTrue();
}
