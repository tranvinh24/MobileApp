package com.eldercare.service;

import com.eldercare.dto.HealthEntryDto;
import com.eldercare.dto.UpsertHealthEntryRequest;
import com.eldercare.model.HealthEntry;
import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.ElderlyCaregiverRepository;
import com.eldercare.repository.HealthEntryRepository;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HealthService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final HealthEntryRepository healthEntryRepository;
    private final UserRepository userRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;

    public List<HealthEntryDto> listEntries(Long elderlyId, LocalDateTime from, LocalDateTime to, int limit, Long currentUserId) {
        requireCanView(elderlyId, currentUserId);
        int pageSize = Math.min(Math.max(limit, 1), 200);

        List<HealthEntry> list;
        if (from != null && to != null) {
            list = healthEntryRepository.findByElderlyIdAndRecordedAtBetweenOrderByRecordedAtDesc(
                    elderlyId, from, to, PageRequest.of(0, pageSize));
        } else {
            list = healthEntryRepository.findByElderlyIdOrderByRecordedAtDesc(elderlyId, PageRequest.of(0, pageSize));
        }
        return list.stream().map(this::toDto).toList();
    }

    @Transactional
    public HealthEntryDto create(Long elderlyId, UpsertHealthEntryRequest req, Long currentUserId) {
        requireCaregiverOf(elderlyId, currentUserId);

        User elderly = userRepository.findById(elderlyId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi"));
        User recorder = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        HealthEntry e = HealthEntry.builder()
                .elderly(elderly)
                .recordedBy(recorder)
                .recordedAt(req.getRecordedAt())
                .systolic(req.getSystolic())
                .diastolic(req.getDiastolic())
                .heartRate(req.getHeartRate())
                .bloodGlucose(req.getBloodGlucose())
                .temperature(req.getTemperature())
                .weight(req.getWeight())
                .note(req.getNote())
                .build();
        e = healthEntryRepository.save(e);
        return toDto(e);
    }

    @Transactional
    public HealthEntryDto update(Long id, UpsertHealthEntryRequest req, Long currentUserId) {
        HealthEntry e = healthEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi"));
        requireCaregiverOf(e.getElderly().getId(), currentUserId);

        if (req.getRecordedAt() != null) e.setRecordedAt(req.getRecordedAt());
        if (req.getSystolic() != null) e.setSystolic(req.getSystolic());
        if (req.getDiastolic() != null) e.setDiastolic(req.getDiastolic());
        if (req.getHeartRate() != null) e.setHeartRate(req.getHeartRate());
        if (req.getBloodGlucose() != null) e.setBloodGlucose(req.getBloodGlucose());
        if (req.getTemperature() != null) e.setTemperature(req.getTemperature());
        if (req.getWeight() != null) e.setWeight(req.getWeight());
        if (req.getNote() != null) e.setNote(req.getNote());

        e = healthEntryRepository.save(e);
        return toDto(e);
    }

    @Transactional
    public void delete(Long id, Long currentUserId) {
        HealthEntry e = healthEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi"));
        requireCaregiverOf(e.getElderly().getId(), currentUserId);
        healthEntryRepository.delete(e);
    }

    private void requireCanView(Long elderlyId, Long currentUserId) {
        User me = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        if (me.getRole() == UserRole.ADMIN) return;
        if (me.getRole() == UserRole.ELDERLY && me.getId().equals(elderlyId)) return;
        if (me.getRole() == UserRole.CAREGIVER) {
            User elderly = userRepository.findById(elderlyId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi"));
            boolean linked = elderlyCaregiverRepository.existsByElderlyAndCaregiver(elderly, me);
            if (linked) return;
        }
        throw new RuntimeException("Không có quyền xem dữ liệu sức khoẻ");
    }

    private void requireCaregiverOf(Long elderlyId, Long currentUserId) {
        User me = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        if (me.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("Chỉ người giám hộ mới được thao tác");
        }
        User elderly = userRepository.findById(elderlyId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi"));
        boolean linked = elderlyCaregiverRepository.existsByElderlyAndCaregiver(elderly, me);
        if (!linked) throw new RuntimeException("Bạn chưa liên kết với người cao tuổi này");
    }

    private HealthEntryDto toDto(HealthEntry e) {
        return HealthEntryDto.builder()
                .id(e.getId())
                .elderlyId(e.getElderly() != null ? e.getElderly().getId() : null)
                .recordedBy(e.getRecordedBy() != null ? e.getRecordedBy().getId() : null)
                .recordedByName(e.getRecordedBy() != null ? e.getRecordedBy().getFullName() : null)
                .recordedAt(e.getRecordedAt() != null ? ISO.format(e.getRecordedAt()) : null)
                .systolic(e.getSystolic())
                .diastolic(e.getDiastolic())
                .heartRate(e.getHeartRate())
                .bloodGlucose(e.getBloodGlucose() != null ? e.getBloodGlucose().toString() : null)
                .temperature(e.getTemperature() != null ? e.getTemperature().toString() : null)
                .weight(e.getWeight() != null ? e.getWeight().toString() : null)
                .note(e.getNote())
                .build();
    }
}

