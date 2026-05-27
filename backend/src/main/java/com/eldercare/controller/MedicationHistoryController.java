package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.dto.MedicationHistoryDto;
import com.eldercare.model.MedicationHistory;
import com.eldercare.service.MedicationHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medication-history")
@RequiredArgsConstructor
public class MedicationHistoryController {

    private final MedicationHistoryService historyService;

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<MedicationHistoryDto>> confirmTaken(@RequestBody Map<String, Object> body) {
        Long scheduleId = Long.valueOf(body.get("scheduleId").toString());
        String timeStr = body.get("scheduledTime").toString();
        LocalDateTime scheduledTime = LocalDateTime.parse(timeStr);
        MedicationHistory history = historyService.confirmTaken(scheduleId, scheduledTime);
        return ResponseEntity.ok(ApiResponse.success(MedicationHistoryDto.fromEntity(history)));
    }

    @PostMapping("/skip")
    public ResponseEntity<ApiResponse<MedicationHistoryDto>> skip(@RequestBody Map<String, Object> body) {
        Long scheduleId = Long.valueOf(body.get("scheduleId").toString());
        String timeStr = body.get("scheduledTime").toString();
        LocalDateTime scheduledTime = LocalDateTime.parse(timeStr);
        String notes = body.get("notes") != null ? body.get("notes").toString() : null;
        MedicationHistory history = historyService.skip(scheduleId, scheduledTime, notes);
        return ResponseEntity.ok(ApiResponse.success(MedicationHistoryDto.fromEntity(history)));
    }

    @GetMapping("/elderly/{elderlyId}")
    public ResponseEntity<ApiResponse<List<MedicationHistoryDto>>> getByElderly(
            @PathVariable Long elderlyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<MedicationHistory> list = historyService.getHistoryByElderly(elderlyId, start, end);
        return ResponseEntity.ok(ApiResponse.success(list.stream().map(MedicationHistoryDto::fromEntity).toList()));
    }
}
