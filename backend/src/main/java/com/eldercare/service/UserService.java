package com.eldercare.service;

import com.eldercare.model.DeviceToken;
import com.eldercare.model.ElderlyCaregiver;
import com.eldercare.model.ElderlyProfile;
import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.DeviceTokenRepository;
import com.eldercare.repository.ElderlyCaregiverRepository;
import com.eldercare.repository.ElderlyProfileRepository;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * UserService – Quản lý người dùng và hồ sơ người cao tuổi.
 * 
 * Liên quan đến chức năng 3: Quản lý hồ sơ cá nhân.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ElderlyProfileRepository elderlyProfileRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final AlertService alertService;
    private final PushService pushService;

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    }

    public List<User> getLinkedElderly(Long caregiverId) {
        User caregiver = findById(caregiverId);
        return elderlyCaregiverRepository.findByCaregiver(caregiver).stream()
                .map(ElderlyCaregiver::getElderly)
                .collect(Collectors.toList());
    }

    public List<User> getLinkedCaregivers(Long elderlyId) {
        User elderly = findById(elderlyId);
        return elderlyCaregiverRepository.findByElderly(elderly).stream()
                .map(ElderlyCaregiver::getCaregiver)
                .collect(Collectors.toList());
    }

    @Transactional
    public void linkElderlyCaregiver(Long elderlyId, Long caregiverId) {
        User elderly = findById(elderlyId);
        User caregiver = findById(caregiverId);

        if (elderly.getRole() != UserRole.ELDERLY || caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("Chỉ có thể liên kết Người cao tuổi với Người giám hộ");
        }

        if (elderlyCaregiverRepository.existsByElderlyAndCaregiver(elderly, caregiver)) {
            throw new RuntimeException("Đã liên kết từ trước");
        }

        ElderlyCaregiver link = ElderlyCaregiver.builder()
                .elderly(elderly)
                .caregiver(caregiver)
                .isPrimary(false)
                .build();
        elderlyCaregiverRepository.save(link);
    }

    @Transactional
    public void unlinkElderlyCaregiver(Long caregiverId, Long elderlyId) {
        User caregiver = findById(caregiverId);
        User elderly = findById(elderlyId);
        if (caregiver.getRole() != UserRole.CAREGIVER || elderly.getRole() != UserRole.ELDERLY) {
            throw new RuntimeException("Chỉ có thể hủy liên kết giữa người giám hộ và người cao tuổi");
        }
        ElderlyCaregiver link = elderlyCaregiverRepository.findByElderlyAndCaregiver(elderly, caregiver)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy liên kết"));
        elderlyCaregiverRepository.delete(link);
    }

    /**
     * Lấy hồ sơ của người cao tuổi. Nếu chưa có, tự động tạo mới (upsert).
     */
    public ElderlyProfile getOrCreateElderlyProfile(Long userId) {
        User user = findById(userId);
        if (user.getRole() != UserRole.ELDERLY) {
            throw new RuntimeException("Chỉ người cao tuổi mới có hồ sơ này");
        }
        // Trả về hồ sơ hoặc tự động lưu một hồ sơ rỗng mới nếu chưa tồn tại
        return elderlyProfileRepository.findByUser(user)
                .orElseGet(() -> {
                    ElderlyProfile profile = ElderlyProfile.builder().user(user).build();
                    return elderlyProfileRepository.save(profile);
                });
    }

    /**
     * Cập nhật thông tin hồ sơ người cao tuổi (Partial Update).
     * Chỉ những trường nào khác null (được client gửi lên) mới bị ghi đè.
     */
    public ElderlyProfile updateElderlyProfile(Long userId, ElderlyProfile updates) {
        ElderlyProfile profile = getOrCreateElderlyProfile(userId);
        if (updates.getDateOfBirth() != null) profile.setDateOfBirth(updates.getDateOfBirth());
        if (updates.getAddress() != null) profile.setAddress(updates.getAddress());
        if (updates.getEmergencyContact() != null) profile.setEmergencyContact(updates.getEmergencyContact());
        if (updates.getMedicalNotes() != null) profile.setMedicalNotes(updates.getMedicalNotes());
        return elderlyProfileRepository.save(profile);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User findElderlyByEmail(String email) {
        return userRepository.findByEmail(email.trim())
                .filter(u -> u.getRole() == UserRole.ELDERLY)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi với email này"));
    }

    private static String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("84") && digits.length() > 9) {
            return "0" + digits.substring(2);
        }
        return digits;
    }

    public User findElderlyByPhone(String phone) {
        String normalized = normalizePhone(phone);
        if (normalized.length() < 9) {
            throw new RuntimeException("Số điện thoại không hợp lệ");
        }
        return userRepository.findByRole(UserRole.ELDERLY).stream()
                .filter(u -> u.getPhone() != null && normalizePhone(u.getPhone()).equals(normalized))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi với số điện thoại này"));
    }

    @Transactional
    public void linkByEmail(Long caregiverId, String elderlyEmail) {
        User caregiver = findById(caregiverId);
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("Chỉ người giám hộ mới có thể thực hiện liên kết");
        }
        User elderly = findElderlyByEmail(elderlyEmail);
        linkElderlyCaregiver(elderly.getId(), caregiverId);
    }

    @Transactional
    public void linkByPhone(Long caregiverId, String elderlyPhone) {
        User caregiver = findById(caregiverId);
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("Chỉ người giám hộ mới có thể thực hiện liên kết");
        }
        User elderly = findElderlyByPhone(elderlyPhone);
        linkElderlyCaregiver(elderly.getId(), caregiverId);
    }
}
