package com.eldercare.scheduler;

import com.eldercare.model.MedicationHistory;
import com.eldercare.model.MedicationSchedule;
import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.model.enums.MedicationHistoryStatus;
import com.eldercare.repository.ElderlyCaregiverRepository;
import com.eldercare.repository.MedicationHistoryRepository;
import com.eldercare.repository.MedicationScheduleRepository;
import com.eldercare.repository.SystemConfigRepository;
import com.eldercare.service.MedicationHistoryService;
import com.eldercare.service.PushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MedicationReminderScheduler {

    private final MedicationScheduleRepository scheduleRepository;
    private final MedicationHistoryRepository historyRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final PushService pushService;
    private final MedicationHistoryService medicationHistoryService;

    // chạy mỗi phút
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void tick() {
        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);

        // auto mark missed
        try {
            medicationHistoryService.autoMarkMissed(now);
        } catch (Exception e) {
            log.warn("autoMarkMissed: {}", e.getMessage());
        }

        if (!getBoolConfig("med_reminder_enabled", true)) return;

        int defaultBefore = getIntConfig("med_reminder_default_minutes_before", 15);
        List<MedicationSchedule> schedules = scheduleRepository.findByIsActiveTrue();

        for (MedicationSchedule s : schedules) {
            try {
                User elderly = s.getMedication().getPrescription().getElderly();
                if (elderly == null) continue;

                // chỉ nhắc trong thời gian đơn thuốc còn hiệu lực (nếu có start/end)
                var p = s.getMedication().getPrescription();
                LocalDate today = LocalDate.now();
                if (p.getStartDate() != null && today.isBefore(p.getStartDate())) continue;
                if (p.getEndDate() != null && today.isAfter(p.getEndDate())) continue;

                int before = s.getReminderMinutesBefore() != null ? s.getReminderMinutesBefore() : defaultBefore;
                if (before < 0) before = 0;

                LocalTime timeOfDay = s.getTimeOfDay();
                if (timeOfDay == null) continue;
                LocalDateTime scheduledTime = today.atTime(timeOfDay).truncatedTo(ChronoUnit.MINUTES);
                LocalDateTime remindAt = scheduledTime.minusMinutes(before).truncatedTo(ChronoUnit.MINUTES);

                if (!now.equals(remindAt)) continue;

                MedicationHistory h = historyRepository.findByMedicationScheduleIdAndScheduledTime(s.getId(), scheduledTime)
                        .orElse(MedicationHistory.builder()
                                .medicationSchedule(s)
                                .scheduledTime(scheduledTime)
                                .status(MedicationHistoryStatus.PENDING)
                                .build());

                if (h.getStatus() != MedicationHistoryStatus.PENDING) continue;
                if (h.getRemindedAt() != null) continue;

                h.setRemindedAt(LocalDateTime.now());
                historyRepository.save(h);

                String medName = s.getMedication().getName();
                String title = "💊 Nhắc uống thuốc";
                String body = (elderly.getFullName() != null ? elderly.getFullName() : "Người cao tuổi") +
                        " cần uống: " + medName + " lúc " + timeOfDay.toString().substring(0, 5);

                List<Long> caregiverIds = elderlyCaregiverRepository.findByElderly(elderly)
                        .stream().map(x -> x.getCaregiver().getId()).toList();

                List<Long> targets = new ArrayList<>();
                targets.add(elderly.getId());
                targets.addAll(caregiverIds);
                pushService.sendToUsers(targets, title, body,
                        java.util.Map.of("type", "MED_REMINDER", "elderlyId", elderly.getId(), "scheduleId", s.getId()));
            } catch (Exception e) {
                log.warn("Reminder error: {}", e.getMessage());
            }
        }
    }

    private boolean getBoolConfig(String key, boolean defaultVal) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(SystemConfig::getConfigValue)
                    .map(String::trim)
                    .filter(v -> !v.isEmpty())
                    .map(v -> v.equalsIgnoreCase("true") || v.equals("1") || v.equalsIgnoreCase("yes"))
                    .orElse(defaultVal);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private int getIntConfig(String key, int defaultVal) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(SystemConfig::getConfigValue)
                    .map(String::trim)
                    .filter(v -> !v.isEmpty())
                    .map(Integer::parseInt)
                    .orElse(defaultVal);
        } catch (Exception e) {
            return defaultVal;
        }
    }
}

