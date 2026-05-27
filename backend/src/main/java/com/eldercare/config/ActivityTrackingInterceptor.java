package com.eldercare.config;

import com.eldercare.security.CurrentUser;
import com.eldercare.service.PassiveCheckInTrackerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * ActivityTrackingInterceptor – Bắt và ghi nhận các thao tác của người dùng.
 * 
 * Liên quan đến chức năng 7: Cảnh báo khi không hoạt động trong thời gian dài.
 * Interceptor này đóng vai trò như một bộ lọc theo dõi mọi tương tác với API.
 */
@Component
@RequiredArgsConstructor
public class ActivityTrackingInterceptor implements HandlerInterceptor {

    private final PassiveCheckInTrackerService passiveCheckInTrackerService;

    /**
     * Hàm này chạy SAU khi controller đã xử lý xong request.
     * Dùng để ghi log hoạt động của người dùng (tạo điểm danh thụ động).
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // Chỉ ghi nhận nếu request thực thi thành công (HTTP status 200-399) và không có exception.
        if (ex != null || response.getStatus() >= 400) return;

        String path = request.getRequestURI();
        // Bỏ qua các đường dẫn không phải API REST (VD: thư mục tĩnh)
        if (path == null || !path.startsWith("/api/")) return;
        // Đăng nhập/đăng ký không được tính là "hoạt động" trong app
        if (path.startsWith("/api/auth/")) return;

        String method = request.getMethod();
        // Chỉ tính các thao tác thay đổi dữ liệu (POST, PUT, DELETE) là hoạt động tích cực.
        // Bỏ qua các thao tác đọc (GET) vì nó có thể do app tự động gọi ngầm.
        if (method == null || method.equalsIgnoreCase("GET") || method.equalsIgnoreCase("OPTIONS")) return;

        // Lấy thông tin user hiện tại từ SecurityContext
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CurrentUser currentUser)) return;

        // Gọi service ghi log thao tác
        passiveCheckInTrackerService.recordUserActivity(currentUser.getUserId(), method.toUpperCase(), path);
    }
}
