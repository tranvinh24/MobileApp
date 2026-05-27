package com.eldercare.repository;

import com.eldercare.model.Alert;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByCaregiverOrderByCreatedAtDesc(User caregiver, org.springframework.data.domain.Pageable pageable);

    List<Alert> findByCaregiverIdOrderByCreatedAtDesc(Long caregiverId, org.springframework.data.domain.Pageable pageable);

    long countByCaregiverIdAndIsReadFalse(Long caregiverId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Alert a WHERE a.elderly.id = :userId OR a.caregiver.id = :userId")
    void deleteByParticipant(@Param("userId") Long userId);
}
