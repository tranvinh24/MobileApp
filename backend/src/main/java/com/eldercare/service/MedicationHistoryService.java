package com.eldercare.service;

import com.eldercare.dto.MedicationHistoryDto;
import com.eldercare.model.MedicationHistory;
import com.eldercare.model.MedicationSchedule;
import com.eldercare.model.enums.MedicationHistoryStatus;
import com.eldercare.repository.ElderlyCaregiverRepository;
import com.eldercare.repository.MedicationHistoryRepository;
import com.eldercare.repository.MedicationScheduleRepository;
import com.eldercare.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicationHistoryService {

    private final MedicationHistoryRepository historyRepository;
    private final MedicationScheduleRepository scheduleRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final PushService pushService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public MedicationHistory confirmTaken(Long scheduleId, LocalDateTime scheduledTime) {
        MedicationSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch uống thuốc"));

        MedicationHistory history = historyRepository.findByMedicationScheduleIdAndScheduledTime(scheduleId, scheduledTime)
                .orElse(MedicationHistory.builder()
                        .medicationSchedule(schedule)
                        .scheduledTime(scheduledTime)
                        .build());
        history.setTakenAt(LocalDateTime.now());
        history.setStatus(MedicationHistoryStatus.TAKEN);
        MedicationHistory saved = historyRepository.save(history);

        // realtime sync: notify elderly & caregivers
        broadcast(saved);
        return saved;
    }

    @Transactional
    public MedicationHistory skip(Long scheduleId, LocalDateTime scheduledTime, String notes) {
        MedicationSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch uống thuốc"));
        MedicationHistory history = historyRepository.findByMedicationScheduleIdAndScheduledTime(scheduleId, scheduledTime)
                .orElse(MedicationHistory.builder()
                        .medicationSchedule(schedule)
                        .scheduledTime(scheduledTime)
                        .build());
        history.setTakenAt(LocalDateTime.now());
        history.setStatus(MedicationHistoryStatus.SKIPPED);
        history.setNotes(notes);
        MedicationHistory saved = historyRepository.save(history);

        // realtime sync: notify elderly & caregivers
        broadcast(saved);
        return saved;
    }

    @Transactional
    public int autoMarkMissed(LocalDateTime now) {
        int minutes = getIntConfig("med_auto_mark_missed_minutes", 60);
        if (minutes <= 0) return 0;
        LocalDateTime cutoff = now.minusMinutes(minutes);
        List<MedicationHistory> pending = historyRepository.findByStatusAndScheduledTimeBefore(MedicationHistoryStatus.PENDING, cutoff);
        int changed = 0;
        for (MedicationHistory h : pending) {
            // Nếu đã uống/skip rồi thì bỏ qua
            if (h.getStatus() != MedicationHistoryStatus.PENDING) continue;
            h.setStatus(MedicationHistoryStatus.MISSED);
            historyRepository.save(h);
            changed++;

            try {
                Long elderlyId = h.getMedicationSchedule().getMedication().getPrescription().getElderly().getId();
                String elderlyName = h.getMedicationSchedule().getMedication().getPrescription().getElderly().getFullName();
                String medName = h.getMedicationSchedule().getMedication().getName();
                var caregivers = elderlyCaregiverRepository.findByElderly(h.getMedicationSchedule().getMedication().getPrescription().getElderly())
                        .stream().map(x -> x.getCaregiver().getId()).toList();
                pushService.sendToUsers(
                        concat(elderlyId, caregivers),
                        "⚠ Bỏ lỡ uống thuốc",
                        elderlyName + " đã bỏ lỡ: " + medName,
                        java.util.Map.of("type", "MISSED_MEDICATION", "elderlyId", elderlyId)
                );
            } catch (Exception ignored) {}
        }
        return changed;
    }

    public List<MedicationHistory> getHistoryByElderly(Long elderlyId, LocalDateTime start, LocalDateTime end) {
        return historyRepository.findByMedicationSchedule_Medication_Prescription_Elderly_IdAndScheduledTimeBetween(
                elderlyId, start, end);
    }

    public List<MedicationHistory> getHistoryBySchedule(Long scheduleId, int limit) {
        return historyRepository.findByMedicationScheduleIdOrderByScheduledTimeDesc(
                scheduleId, PageRequest.of(0, limit));
    }

    private int getIntConfig(String key, int defaultVal) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(c -> c.getConfigValue())
                    .map(String::trim)
                    .filter(v -> !v.isEmpty())
                    .map(Integer::parseInt)
                    .orElse(defaultVal);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static List<Long> concat(Long elderlyId, List<Long> caregiverIds) {
        java.util.ArrayList<Long> list = new java.util.ArrayList<>();
        if (elderlyId != null) list.add(elderlyId);
        if (caregiverIds != null) list.addAll(caregiverIds);
        return list;
    }

    private void broadcast(MedicationHistory h) {
        try {
            if (h == null || h.getMedicationSchedule() == null) return;
            var p = h.getMedicationSchedule().getMedication().getPrescription();
            if (p == null || p.getElderly() == null) return;
            Long elderlyId = p.getElderly().getId();
            MedicationHistoryDto dto = MedicationHistoryDto.fromEntity(h);
            messagingTemplate.convertAndSend("/topic/med-history/" + elderlyId, dto);
            elderlyCaregiverRepository.findByElderly(p.getElderly()).forEach(link ->
                    messagingTemplate.convertAndSend("/topic/med-history/" + link.getCaregiver().getId(), dto)
            );
        } catch (Exception ignored) {}
    }
}
