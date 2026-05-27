package com.eldercare.repository;

import com.eldercare.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    List<DeviceToken> findByUserId(Long userId);

    Optional<DeviceToken> findByUserIdAndToken(Long userId, String token);

    List<DeviceToken> findByUserIdAndRevokedAtIsNull(Long userId);

    Optional<DeviceToken> findByIdAndUserId(Long id, Long userId);

    void deleteByUser_Id(Long userId);
}
