package com.eldercare.repository;

import com.eldercare.model.ElderlyProfile;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ElderlyProfileRepository extends JpaRepository<ElderlyProfile, Long> {

    Optional<ElderlyProfile> findByUser(User user);

    Optional<ElderlyProfile> findByUserId(Long userId);

    void deleteByUser_Id(Long userId);
}
