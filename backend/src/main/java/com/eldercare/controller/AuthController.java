package com.eldercare.controller;

import com.eldercare.dto.*;
import com.eldercare.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController – API cung cấp các chức năng Xác thực người dùng.
 * 
 * Liên quan đến:
 *   - Chức năng 1: Đăng ký tài khoản
 *   - Chức năng 2: Đăng nhập
 * 
 * Các endpoint trong controller này là Public (không yêu cầu JWT token).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * API Đăng ký tài khoản.
     * Xác thực (validate) dữ liệu đầu vào bằng @Valid (Bean Validation).
     * 
     * @param request Dữ liệu người dùng gửi lên: email, password, fullName, phone, role
     * @return Kết quả đăng ký kèm token
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * API Đăng nhập tài khoản.
     * Xác thực email và mật khẩu, trả về JWT token nếu hợp lệ.
     * 
     * @param request Dữ liệu người dùng gửi lên: email, password
     * @return JWT token và thông tin người dùng
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email hoặc mật khẩu không đúng"));
        }
    }
}
