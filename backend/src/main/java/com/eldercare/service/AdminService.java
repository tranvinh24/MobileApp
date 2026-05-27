package com.eldercare.service;

import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AdminService – Dịch vụ quản trị hệ thống.
 * 
 * Liên quan đến chức năng 5: Thiết lập ngưỡng cảnh báo (Cấu hình hệ thống).
 * Cung cấp chức năng xem danh sách người dùng, thống kê và cập nhật các ngưỡng cấu hình động.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final CheckInRepository checkInRepository;
    private final AlertRepository alertRepository;
    private final MedicationHistoryRepository medicationHistoryRepository;
    private final SystemConfigRepository systemConfigRepository;

    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        users.forEach(u -> u.setPasswordHash(null));
        return users;
    }

    @Transactional
    public User updateUser(Long id, Boolean isActive, UserRole role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        if (isActive != null) user.setIsActive(isActive);
        if (role != null) user.setRole(role);
        user = userRepository.save(user);
        user.setPasswordHash(null);
        return user;
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("elderlyCount", userRepository.countByRole(UserRole.ELDERLY));
        stats.put("caregiverCount", userRepository.countByRole(UserRole.CAREGIVER));
        stats.put("adminCount", userRepository.countByRole(UserRole.ADMIN));
        stats.put("prescriptionCount", prescriptionRepository.count());
        stats.put("checkInCount", checkInRepository.count());
        stats.put("alertCount", alertRepository.count());
        stats.put("medicationHistoryCount", medicationHistoryRepository.count());
        return stats;
    }

    /**
     * Lấy toàn bộ danh sách cấu hình hệ thống hiện có trong CSDL.
     * Cấu hình này được lưu dưới dạng cặp Key-Value.
     */
    public List<SystemConfig> getAllConfig() {
        return systemConfigRepository.findAll();
    }

    /**
     * Lấy giá trị của một cấu hình cụ thể theo Key.
     */
    public SystemConfig getConfig(String key) {
        return systemConfigRepository.findByConfigKey(key)
                .orElse(null);
    }

    /**
     * Thêm mới hoặc Cập nhật giá trị cấu hình động.
     * 
     * @param key         Tên cấu hình (Ví dụ: passive_checkin_action_threshold)
     * @param value       Giá trị (Ví dụ: "10")
     * @param description Mô tả cho cấu hình để người dùng dễ hiểu
     * @return SystemConfig đã lưu
     */
    @Transactional
    public SystemConfig setConfig(String key, String value, String description) {
        // Tìm cấu hình cũ, nếu chưa có thì tạo object mới
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElse(SystemConfig.builder().configKey(key).build());
        
        config.setConfigValue(value);
        if (description != null) config.setDescription(description);
        
        return systemConfigRepository.save(config);
    }
}
