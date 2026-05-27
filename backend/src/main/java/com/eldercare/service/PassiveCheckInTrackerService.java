package com.eldercare.service;

import com.eldercare.model.AppActivityLog;
import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.model.enums.CheckInType;
import com.eldercare.model.enums.UserRole;
import com.eldercare.repository.AppActivityLogRepository;
import com.eldercare.repository.CheckInRepository;
import com.eldercare.repository.SystemConfigRepository;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * PassiveCheckInTrackerService – Dịch vụ theo dõi hoạt động và tạo điểm danh thụ động.
 * 
 * Liên quan đến chức năng 7: Cảnh báo khi không hoạt động trong thời gian dài.
 * Nhận thông tin hoạt động từ ActivityTrackingInterceptor, ghi log và kiểm tra
 * xem người dùng có đạt đủ ngưỡng hoạt động để tự động điểm danh hay không.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PassiveCheckInTrackerService {

    private static final int DEFAULT_THRESHOLD = 5;

    private final UserRepository userRepository;
    private final AppActivityLogRepository appActivityLogRepository;
    private final CheckInRepository checkInRepository;
    private final CheckInService checkInService;
    private final SystemConfigRepository systemConfigRepository;

    /**
     * Ghi lại một thao tác của người dùng và tính toán điểm danh thụ động.
     * 
     * Quá trình xử lý:
     * 1. Chỉ thực hiện với người dùng có vai trò là ELDERLY.
     * 2. Ghi nhận log (AppActivityLog) vào cơ sở dữ liệu.
     * 3. Lấy cấu hình ngưỡng thao tác (passive_checkin_action_threshold) từ DB.
     * 4. Đếm số thao tác người dùng đã thực hiện trong ngày hiện tại.
     * 5. Nếu số thao tác đạt một bội số của ngưỡng (ví dụ: thao tác thứ 5, 10, 15...)
     *    VÀ người dùng chưa hề điểm danh trong ngày hôm nay, thì tạo điểm danh (PASSIVE).
     *
     * @param userId ID người thực hiện
     * @param method Phương thức HTTP (POST, PUT, DELETE)
     * @param endpoint Đường dẫn API được gọi
     */
    public void recordUserActivity(Long userId, String method, String endpoint) {
        try {
            // Bước 1: Chỉ theo dõi người cao tuổi
            User user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getRole() != UserRole.ELDERLY) return;

            // Bước 2: Lưu nhật ký thao tác
            AppActivityLog logRow = AppActivityLog.builder()
                    .user(user)
                    .httpMethod(method)
                    .endpoint(endpoint)
                    .build();
            appActivityLogRepository.save(logRow);

            // Bước 3: Đọc cấu hình số lần thao tác tối thiểu để điểm danh thụ động
            int threshold = resolveThreshold();
            if (threshold <= 0) threshold = DEFAULT_THRESHOLD;

            // Xác định thời gian đầu/cuối ngày hôm nay để đếm số thao tác
            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

            // Bước 4: Đếm số lượng hành động người dùng đã làm từ sáng đến giờ
            long todayActions = appActivityLogRepository.countByUserIdAndCreatedAtBetween(userId, startOfDay, endOfDay);
            
            // Bước 5: Kiểm tra xem số lượng hành động đã chia hết cho ngưỡng chưa
            if (todayActions % threshold != 0) return;

            // Kiểm tra xem đã điểm danh thụ động hay chủ động trong hôm nay chưa
            boolean alreadyCheckedInToday = checkInRepository
                    .findFirstByElderlyIdAndCheckedAtBetweenOrderByCheckedAtDesc(userId, startOfDay, endOfDay)
                    .isPresent();
            if (alreadyCheckedInToday) return;

            // Nếu đạt chuẩn, tạo mới 1 điểm danh PASSIVE (Thụ động)
            checkInService.createCheckIn(
                    userId,
                    CheckInType.PASSIVE,
                    "Điểm danh thụ động tự động sau " + todayActions + " thao tác trong ứng dụng.",
                    null,
                    null
            );
            log.info("Auto passive check-in created for elderlyId={} after {} actions", userId, todayActions);
        } catch (Exception e) {
            log.warn("PassiveCheckInTrackerService failed: {}", e.getMessage());
        }
    }

    /**
     * Lấy giá trị ngưỡng thao tác cần thiết từ bảng system_config.
     * Sử dụng fallback an toàn (try-catch, orElse) để tránh lỗi ứng dụng.
     */
    private int resolveThreshold() {
        try {
            return systemConfigRepository.findByConfigKey("passive_checkin_action_threshold")
                    .map(SystemConfig::getConfigValue)
                    .map(String::trim)
                    .filter(v -> !v.isBlank())
                    .map(Integer::parseInt)
                    .orElse(DEFAULT_THRESHOLD);
        } catch (Exception e) {
            return DEFAULT_THRESHOLD;
        }
    }
}
