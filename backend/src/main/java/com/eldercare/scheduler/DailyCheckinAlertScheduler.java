package com.eldercare.scheduler;

import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.model.enums.AlertType;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.CheckInRepository;
import com.eldercare.repository.SystemConfigRepository;
import com.eldercare.repository.UserRepository;
import com.eldercare.service.AlertService;
import com.eldercare.service.PushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyCheckinAlertScheduler {

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final CheckInRepository checkInRepository;
    private final AlertService alertService;
    private final PushService pushService;
    private final com.eldercare.repository.ElderlyCaregiverRepository elderlyCaregiverRepository;

    // chạy mỗi 10 phút
    @Scheduled(fixedDelay = 600_000)
    public void tick() {
        if (!getBoolConfig("daily_checkin_alert_enabled", true)) return;

        LocalTime deadline = parseTime(getConfig("daily_checkin_deadline_time").orElse("20:00"));
        int grace = getIntConfig("daily_checkin_grace_minutes", 30);
        LocalDateTime now = LocalDateTime.now();

        LocalDate today = LocalDate.now();
        LocalDateTime due = today.atTime(deadline).plusMinutes(grace);
        if (now.isBefore(due)) return;

        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        List<User> elderlyUsers = userRepository.findByRole(UserRole.ELDERLY);
        for (User elderly : elderlyUsers) {
            try {
                boolean hasCheckin = checkInRepository.findFirstByElderlyIdAndCheckedAtBetweenOrderByCheckedAtDesc(
                        elderly.getId(), start, end).isPresent();
                if (hasCheckin) continue;

                // create alerts for caregivers (existing behavior) + push to both
                String title = "⚠ Chưa điểm danh hôm nay";
                String message = (elderly.getFullName() != null ? elderly.getFullName() : "Người cao tuổi")
                        + " chưa điểm danh hôm nay.";

                alertService.createAlert(elderly.getId(), AlertType.NO_CHECKIN, title, message, null, null);

                List<Long> caregiverIds = elderlyCaregiverRepository.findByElderly(elderly)
                        .stream().map(x -> x.getCaregiver().getId()).toList();
                List<Long> targets = new ArrayList<>();
                targets.add(elderly.getId());
                targets.addAll(caregiverIds);
                pushService.sendToUsers(targets, title, message,
                        java.util.Map.of("type", "NO_CHECKIN", "elderlyId", elderly.getId()));
            } catch (Exception e) {
                log.warn("daily checkin alert error: {}", e.getMessage());
            }
        }
    }

    private java.util.Optional<String> getConfig(String key) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(SystemConfig::getConfigValue)
                    .map(String::trim)
                    .filter(v -> !v.isEmpty());
        } catch (Exception e) {
            return java.util.Optional.empty();
        }
    }

    private boolean getBoolConfig(String key, boolean defaultVal) {
        return getConfig(key)
                .map(v -> v.equalsIgnoreCase("true") || v.equals("1") || v.equalsIgnoreCase("yes"))
                .orElse(defaultVal);
    }

    private int getIntConfig(String key, int defaultVal) {
        try {
            return getConfig(key).map(Integer::parseInt).orElse(defaultVal);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private LocalTime parseTime(String hhmm) {
        try {
            return LocalTime.parse(hhmm.trim().length() == 5 ? hhmm.trim() : "20:00");
        } catch (Exception e) {
            return LocalTime.of(20, 0);
        }
    }
}

