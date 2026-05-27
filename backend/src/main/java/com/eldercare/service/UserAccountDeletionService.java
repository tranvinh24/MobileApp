package com.eldercare.service;

import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAccountDeletionService {

    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationHistoryRepository medicationHistoryRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final AlertRepository alertRepository;
    private final HealthEntryRepository healthEntryRepository;
    private final CheckInRepository checkInRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final AppActivityLogRepository appActivityLogRepository;
    private final ElderlyProfileRepository elderlyProfileRepository;

    @Transactional
    public void deleteUserAccount(Long userId, Long actingAdminId) {
        if (actingAdminId != null && actingAdminId.equals(userId)) {
            throw new RuntimeException("Kh\u00f4ng th\u1ec3 x\u00f3a t\u00e0i kho\u1ea3n c\u1ee7a ch\u00ednh b\u1ea1n");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kh\u00f4ng t\u00ecm th\u1ea5y ng\u01b0\u1eddi d\u00f9ng"));
        if (user.getRole() == UserRole.ADMIN && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new RuntimeException("Kh\u00f4ng th\u1ec3 x\u00f3a admin cu\u1ed1i c\u00f9ng");
        }

        prescriptionRepository.clearCreatedByForUser(userId);
        medicationHistoryRepository.deleteAllForElderlyPrescriptions(userId);
        prescriptionRepository.deleteByElderly_Id(userId);

        messageRepository.deleteByConversationParticipant(userId);
        conversationRepository.deleteByParticipant(userId);

        alertRepository.deleteByParticipant(userId);
        healthEntryRepository.deleteByUserInvolved(userId);
        checkInRepository.deleteByElderly_Id(userId);
        elderlyCaregiverRepository.deleteByUserInvolved(userId);

        deviceTokenRepository.deleteByUser_Id(userId);
        appActivityLogRepository.deleteByUser_Id(userId);
        elderlyProfileRepository.deleteByUser_Id(userId);

        userRepository.deleteById(userId);
    }
}
