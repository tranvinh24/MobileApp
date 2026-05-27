package com.eldercare.config;

import com.eldercare.model.User;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Khi backend khởi động: đảm bảo có tài khoản admin (email: admin, mật khẩu: admin123).
 * Nếu chưa có thì tạo mới; nếu có rồi thì cập nhật lại password_hash đúng với "admin123".
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin";
    private static final String ADMIN_PASSWORD = "admin123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        try {
            String encodedPassword = passwordEncoder.encode(ADMIN_PASSWORD);
            userRepository.findByEmail(ADMIN_EMAIL)
                    .ifPresentOrElse(
                            user -> {
                                if (!passwordEncoder.matches(ADMIN_PASSWORD, user.getPasswordHash())) {
                                    user.setPasswordHash(encodedPassword);
                                    user.setIsActive(true);
                                    userRepository.save(user);
                                    log.info("Đã cập nhật mật khẩu tài khoản admin.");
                                }
                            },
                            () -> {
                                User admin = User.builder()
                                        .email(ADMIN_EMAIL)
                                        .passwordHash(encodedPassword)
                                        .fullName("Administrator")
                                        .role(UserRole.ADMIN)
                                        .isActive(true)
                                        .build();
                                userRepository.save(admin);
                                log.info("Đã tạo tài khoản admin (email: admin, mật khẩu: admin123).");
                            }
                    );
        } catch (Exception e) {
            log.warn("AdminSeeder: {}", e.getMessage());
        }
    }
}
