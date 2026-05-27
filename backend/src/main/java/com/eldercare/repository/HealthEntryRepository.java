package com.eldercare.repository;

import com.eldercare.model.HealthEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface HealthEntryRepository extends JpaRepository<HealthEntry, Long> {

    List<HealthEntry> findByElderlyIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long elderlyId,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    );

    List<HealthEntry> findByElderlyIdOrderByRecordedAtDesc(Long elderlyId, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM HealthEntry h WHERE h.elderly.id = :userId OR h.recordedBy.id = :userId")
    void deleteByUserInvolved(@Param("userId") Long userId);
}

