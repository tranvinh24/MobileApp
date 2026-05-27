package com.eldercare.service;

import com.eldercare.dto.*;
import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.UserRepository;
import com.eldercare.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * AuthService – Dịch vụ xác thực người dùng.
 *
 * Đảm nhận 2 chức năng chính:
 *   - Chức năng 1: Đăng ký tài khoản mới (register)
 *   - Chức năng 2: Đăng nhập và cấp JWT token (login)
 *
 * Mật khẩu luôn được mã hoá bằng BCrypt trước khi lưu vào DB.
 * Sau đăng ký / đăng nhập thành công, hệ thống trả về JWT token
 * để client sử dụng cho các request tiếp theo.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Đăng ký tài khoản người dùng mới.
     *
     * Quy trình:
     * 1. Kiểm tra email đã tồn tại trong hệ thống chưa → nếu trùng, ném RuntimeException.
     * 2. Chặn đăng ký vai trò ADMIN từ API công khai (Admin chỉ tạo qua DB / seeder).
     * 3. Mã hoá mật khẩu bằng BCrypt (salt ngẫu nhiên, không thể giải mã ngược).
     * 4. Lưu bản ghi User vào bảng `users`.
     * 5. Tạo JWT token và trả về ngay để client đăng nhập luôn mà không cần bước thêm.
     *
     * @param request DTO chứa email, password, fullName, phone, role
     * @return AuthResponse chứa JWT token và thông tin user
     */
    public AuthResponse register(RegisterRequest request) {
        // Bước 1: Kiểm tra email trùng
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được đăng ký");
        }
        // Bước 2: Chặn tự đăng ký vai trò ADMIN
        if (request.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("Không thể đăng ký vai trò Admin");
        }

        // Bước 3 & 4: Mã hoá password và lưu user
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) // BCrypt hash
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole())
                .isActive(true) // Tài khoản kích hoạt ngay sau khi đăng ký
                .build();
        user = userRepository.save(user);

        // Bước 5: Tạo JWT và trả về response
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .message("Đăng ký thành công")
                .build();
    }

    /**
     * Đăng nhập và cấp JWT token.
     *
     * Quy trình:
     * 1. Uỷ thác xác thực cho Spring Security AuthenticationManager
     *    (tự load UserDetails từ DB, so sánh BCrypt hash).
     *    Nếu sai email/password → ném BadCredentialsException.
     * 2. Kiểm tra trạng thái `is_active` – tài khoản bị Admin khoá
     *    sẽ bị từ chối dù mật khẩu đúng.
     * 3. Tạo JWT token mới (hết hạn sau 24h) và trả về client.
     *
     * @param request DTO chứa email và password
     * @return AuthResponse chứa JWT token và thông tin user
     */
    public AuthResponse login(LoginRequest request) {
        // Bước 1: Xác thực qua Spring Security (so khớp email + BCrypt password)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Bước 2: Kiểm tra tài khoản chưa bị Admin vô hiệu hoá
        if (!user.getIsActive()) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hóa");
        }

        // Bước 3: Tạo JWT và trả về
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .message("Đăng nhập thành công")
                .build();
    }
}
