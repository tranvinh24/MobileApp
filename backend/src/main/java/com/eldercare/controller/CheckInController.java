package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.dto.CheckInDto;
import com.eldercare.model.CheckIn;
import com.eldercare.model.enums.CheckInType;
import com.eldercare.service.CheckInService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/check-ins")
@RequiredArgsConstructor
public class CheckInController {

    private final CheckInService checkInService;

    @PostMapping
    public ResponseEntity<ApiResponse<CheckInDto>> create(@RequestBody Map<String, Object> body) {
        Long elderlyId = Long.valueOf(body.get("elderlyId").toString());
        String typeStr = (String) body.get("type");
        CheckInType type = typeStr != null && typeStr.equals("PASSIVE") ? CheckInType.PASSIVE : CheckInType.ACTIVE;
        String notes = (String) body.get("notes");
        BigDecimal lat = body.get("latitude") != null ? new BigDecimal(body.get("latitude").toString()) : null;
        BigDecimal lng = body.get("longitude") != null ? new BigDecimal(body.get("longitude").toString()) : null;

        CheckIn checkIn = checkInService.createCheckIn(elderlyId, type, notes, lat, lng);
        return ResponseEntity.ok(ApiResponse.success(CheckInDto.fromEntity(checkIn)));
    }

    @GetMapping("/elderly/{elderlyId}")
    public ResponseEntity<ApiResponse<List<CheckInDto>>> getByElderly(@PathVariable Long elderlyId,
                                                                      @RequestParam(defaultValue = "30") int limit) {
        List<CheckIn> list = checkInService.getCheckInsByElderly(elderlyId, limit);
        return ResponseEntity.ok(ApiResponse.success(list.stream().map(CheckInDto::fromEntity).toList()));
    }
}
