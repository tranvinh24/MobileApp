package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.dto.HealthEntryDto;
import com.eldercare.dto.UpsertHealthEntryRequest;
import com.eldercare.security.CurrentUser;
import com.eldercare.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping("/elderly/{elderlyId}/entries")
    public ResponseEntity<ApiResponse<List<HealthEntryDto>>> list(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable Long elderlyId,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to,
            @RequestParam(required = false, defaultValue = "100") Integer limit
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        List<HealthEntryDto> list = healthService.listEntries(
                elderlyId,
                from,
                to,
                limit == null ? 100 : limit,
                currentUser.getUserId()
        );
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/elderly/{elderlyId}/entries")
    public ResponseEntity<ApiResponse<HealthEntryDto>> create(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable Long elderlyId,
            @RequestBody UpsertHealthEntryRequest req
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        HealthEntryDto dto = healthService.create(elderlyId, req, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PutMapping("/entries/{id}")
    public ResponseEntity<ApiResponse<HealthEntryDto>> update(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable Long id,
            @RequestBody UpsertHealthEntryRequest req
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        HealthEntryDto dto = healthService.update(id, req, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @DeleteMapping("/entries/{id}")
    public ResponseEntity<ApiResponse<String>> delete(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable Long id
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        healthService.delete(id, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("OK"));
    }
}

