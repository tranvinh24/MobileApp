package com.eldercare.config;

import com.eldercare.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;

/**
 * SecurityConfig – Cấu hình trung tâm về bảo mật và phân quyền của hệ thống.
 * 
 * Liên quan đến chức năng 6: Phân quyền người dùng.
 * Áp dụng mô hình bảo mật phi trạng thái (Stateless) sử dụng JWT.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Bật tính năng phân quyền ở cấp độ method bằng @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    /**
     * Cấu hình chuỗi bộ lọc bảo mật (Security Filter Chain).
     * Định nghĩa các quy tắc truy cập cho từng endpoint API.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Vô hiệu hóa CSRF vì REST API dùng JWT
                .cors(cors -> cors.configure(http))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Cho phép pre-flight CORS
                        .requestMatchers("/api/auth/**").permitAll() // API đăng ký, đăng nhập không cần xác thực
                        .requestMatchers("/uploads/**").permitAll() // Cho phép tải file tĩnh
                        .requestMatchers("/api/admin/**").hasRole("ADMIN") // Chỉ role ADMIN mới được truy cập API /api/admin/**
                        .anyRequest().authenticated() // Tất cả các request khác đều phải xác thực
                )
                .sessionManagement(session ->
                        // Đặt policy là STATELESS: Spring Security không tự tạo session
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                // Thêm JwtAuthenticationFilter để kiểm tra JWT trước UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Cung cấp AuthenticationProvider dựa trên DAO, sử dụng UserDetailsService và BCrypt.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Cung cấp thuật toán mã hoá mật khẩu.
     * Sử dụng BCrypt - an toàn và chống lại tấn công rainbow table.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cung cấp AuthenticationManager dùng để xác thực quá trình login.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
