package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.security.CurrentUser;
import com.eldercare.service.AdminService;
import com.eldercare.service.UserAccountDeletionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AdminController – API dành riêng cho Quản trị viên (Admin).
 * 
 * Liên quan đến:
 *   - Chức năng 5: Thiết lập ngưỡng cảnh báo
 *   - Chức năng 6: Phân quyền (bảo vệ các endpoint này bằng @PreAuthorize)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
// Tất cả các API trong lớp này ĐỀU BẮT BUỘC người dùng phải có ROLE_ADMIN
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserAccountDeletionService userAccountDeletionService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<User>> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Boolean isActive = body.get("isActive") != null ? (Boolean) body.get("isActive") : null;
        UserRole role = body.get("role") != null ? UserRole.valueOf(body.get("role").toString()) : null;
        User user = adminService.updateUser(id, isActive, role);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }
        userAccountDeletionService.deleteUserAccount(id, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa tài khoản", null));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getStats()));
    }

    /**
     * Xem danh sách tất cả các cấu hình hiện tại của hệ thống.
     */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<List<SystemConfig>>> getConfig() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllConfig()));
    }

    /**
     * Cập nhật các ngưỡng cấu hình hệ thống (ví dụ: số thiết bị tối đa, số hành động cần thiết để cảnh báo).
     */
    @PutMapping("/config")
    public ResponseEntity<ApiResponse<SystemConfig>> setConfig(@RequestBody Map<String, String> body) {
        String key = body.get("configKey");
        String value = body.get("configValue");
        String description = body.get("description");
        
        if (key == null || key.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu configKey"));
        }
        
        SystemConfig config = adminService.setConfig(key, value, description);
        return ResponseEntity.ok(ApiResponse.success(config));
    }
}
