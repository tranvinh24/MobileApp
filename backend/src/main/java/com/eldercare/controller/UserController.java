package com.eldercare.controller;

import com.eldercare.dto.ApiResponse;
import com.eldercare.model.ElderlyProfile;
import com.eldercare.model.User;
import com.eldercare.security.CurrentUser;
import com.eldercare.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * UserController – API cho các chức năng quản lý người dùng.
 * 
 * Liên quan đến chức năng 3: Quản lý hồ sơ cá nhân.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Xem thông tin tài khoản hiện tại.
     * Mật khẩu (hash) được xoá trước khi trả về để đảm bảo an toàn.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(@AuthenticationPrincipal CurrentUser currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }
        User user = userService.findById(currentUser.getUserId());
        user.setPasswordHash(null); // Bảo mật: Không bao giờ trả về mật khẩu
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @GetMapping("/linked-elderly")
    public ResponseEntity<ApiResponse<List<User>>> getLinkedElderly(@RequestParam Long caregiverId) {
        List<User> elderly = userService.getLinkedElderly(caregiverId);
        return ResponseEntity.ok(ApiResponse.success(elderly));
    }

    @GetMapping("/linked-caregivers")
    public ResponseEntity<ApiResponse<List<User>>> getLinkedCaregivers(@RequestParam Long elderlyId) {
        List<User> caregivers = userService.getLinkedCaregivers(elderlyId);
        return ResponseEntity.ok(ApiResponse.success(caregivers));
    }

    @PostMapping("/link")
    public ResponseEntity<ApiResponse<String>> linkElderlyCaregiver(@RequestBody Map<String, Long> body) {
        Long elderlyId = body.get("elderlyId");
        Long caregiverId = body.get("caregiverId");
        userService.linkElderlyCaregiver(elderlyId, caregiverId);
        return ResponseEntity.ok(ApiResponse.success("Liên kết thành công", "OK"));
    }

    @PostMapping("/unlink")
    public ResponseEntity<ApiResponse<String>> unlinkElderlyCaregiver(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestBody Map<String, Long> body) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }
        Long elderlyId = body.get("elderlyId");
        if (elderlyId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu elderlyId"));
        }
        userService.unlinkElderlyCaregiver(currentUser.getUserId(), elderlyId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy liên kết", "OK"));
    }

    @PostMapping("/link-by-email")
    public ResponseEntity<ApiResponse<String>> linkByEmail(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestBody Map<String, String> body) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Vui lòng nhập email"));
        }
        userService.linkByEmail(currentUser.getUserId(), email);
        return ResponseEntity.ok(ApiResponse.success("Liên kết thành công", "OK"));
    }

    @PostMapping("/link-by-phone")
    public ResponseEntity<ApiResponse<String>> linkByPhone(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestBody Map<String, String> body) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }
        String phone = body.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Vui lòng nhập số điện thoại"));
        }
        userService.linkByPhone(currentUser.getUserId(), phone);
        return ResponseEntity.ok(ApiResponse.success("Liên kết thành công", "OK"));
    }

    /**
     * Lấy hồ sơ sức khỏe và thông tin mở rộng của người cao tuổi.
     */
    @GetMapping("/profile/elderly/{userId}")
    public ResponseEntity<ApiResponse<ElderlyProfile>> getElderlyProfile(@PathVariable Long userId) {
        ElderlyProfile profile = userService.getOrCreateElderlyProfile(userId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    /**
     * Cập nhật hồ sơ sức khỏe, liên hệ khẩn cấp, địa chỉ... cho người cao tuổi.
     */
    @PutMapping("/profile/elderly/{userId}")
    public ResponseEntity<ApiResponse<ElderlyProfile>> updateElderlyProfile(
            @PathVariable Long userId, @RequestBody ElderlyProfile updates) {
        ElderlyProfile profile = userService.updateElderlyProfile(userId, updates);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
