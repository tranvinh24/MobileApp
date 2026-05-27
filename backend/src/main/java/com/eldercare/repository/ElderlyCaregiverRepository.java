package com.eldercare.repository;

import com.eldercare.model.ElderlyCaregiver;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ElderlyCaregiverRepository extends JpaRepository<ElderlyCaregiver, Long> {

    List<ElderlyCaregiver> findByCaregiver(User caregiver);

    List<ElderlyCaregiver> findByElderly(User elderly);

    Optional<ElderlyCaregiver> findByElderlyAndCaregiver(User elderly, User caregiver);

    boolean existsByElderlyAndCaregiver(User elderly, User caregiver);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ElderlyCaregiver e WHERE e.elderly.id = :userId OR e.caregiver.id = :userId")
    void deleteByUserInvolved(@Param("userId") Long userId);
}
