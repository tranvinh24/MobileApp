package com.eldercare.repository;

import com.eldercare.model.Prescription;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    List<Prescription> findByElderlyOrderByCreatedAtDesc(User elderly);

    List<Prescription> findByElderlyIdOrderByCreatedAtDesc(Long elderlyId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Prescription p SET p.createdBy = NULL WHERE p.createdBy.id = :userId")
    void clearCreatedByForUser(@Param("userId") Long userId);

    void deleteByElderly_Id(Long elderlyId);
}
