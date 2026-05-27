package com.eldercare.repository;

import com.eldercare.model.Medication;
import com.eldercare.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationRepository extends JpaRepository<Medication, Long> {

    List<Medication> findByPrescription(Prescription prescription);
}
