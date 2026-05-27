package com.eldercare.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JwtAuthenticationFilter – Filter xác thực JWT chạy trước mọi HTTP request.
 *
 * Liên quan đến:
 *   - Chức năng 2: Đăng nhập / đăng xuất (xác thực token mỗi request)
 *   - Chức năng 6: Phân quyền người dùng (set Authentication vào SecurityContext)
 *
 * Kế thừa OncePerRequestFilter để đảm bảo filter chỉ chạy 1 lần/request.
 *
 * Luồng xử lý:
 *   1. Trích xuất JWT từ header "Authorization: Bearer <token>"
 *   2. Xác thực chữ ký và thời hạn token
 *   3. Load UserDetails từ DB theo email trong token
 *   4. Set Authentication vào SecurityContext để Spring Security nhận diện user
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    /**
     * Xử lý xác thực JWT cho mỗi HTTP request.
     *
     * Nếu token hợp lệ, SecurityContext được cập nhật để các controller
     * có thể đọc thông tin user qua @AuthenticationPrincipal.
     * Nếu không có token hoặc token không hợp lệ, request vẫn tiếp tục
     * (Spring Security sẽ từ chối ở bước authorize nếu endpoint yêu cầu xác thực).
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // Bước 1: Trích xuất JWT từ header Authorization
            String jwt = getJwtFromRequest(request);

            // Bước 2: Xác thực token và set Authentication vào SecurityContext
            if (StringUtils.hasText(jwt) && jwtUtil.validateToken(jwt)) {
                String email = jwtUtil.getEmailFromToken(jwt); // Lấy email từ JWT payload

                // Bước 3: Load UserDetails từ DB theo email
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                // Bước 4: Tạo Authentication object và đặt vào SecurityContext
                // authorities: danh sách quyền (ROLE_ELDERLY, ROLE_CAREGIVER, ROLE_ADMIN)
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            // Log lỗi nhưng không ném exception – để filter chain tiếp tục
            // Spring Security sẽ xử lý unauthorize ở bước sau
            logger.error("Could not set user authentication in security context", ex);
        }

        // Chuyển tiếp request đến filter/controller tiếp theo
        filterChain.doFilter(request, response);
    }

    /**
     * Trích xuất JWT từ header Authorization.
     * Header phải có định dạng: "Bearer <token>"
     *
     * @param request HTTP request
     * @return Chuỗi JWT (không bao gồm prefix "Bearer "), hoặc null nếu không có
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        // Kiểm tra header tồn tại và bắt đầu bằng "Bearer "
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Bỏ 7 ký tự "Bearer "
        }
        return null;
    }
}
