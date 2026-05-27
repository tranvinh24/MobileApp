package com.eldercare.repository;

import com.eldercare.model.AppActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface AppActivityLogRepository extends JpaRepository<AppActivityLog, Long> {
    long countByUserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    void deleteByUser_Id(Long userId);
}
