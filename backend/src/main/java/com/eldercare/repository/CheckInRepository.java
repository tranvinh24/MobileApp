package com.eldercare.repository;

import com.eldercare.model.CheckIn;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    List<CheckIn> findByElderlyOrderByCheckedAtDesc(User elderly, org.springframework.data.domain.Pageable pageable);

    List<CheckIn> findByElderlyIdOrderByCheckedAtDesc(Long elderlyId, org.springframework.data.domain.Pageable pageable);

    Optional<CheckIn> findFirstByElderlyIdAndCheckedAtBetweenOrderByCheckedAtDesc(
            Long elderlyId, LocalDateTime start, LocalDateTime end);

    void deleteByElderly_Id(Long elderlyId);
}
