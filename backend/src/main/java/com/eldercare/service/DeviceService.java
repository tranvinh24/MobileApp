package com.eldercare.service;

import com.eldercare.dto.RegisterDeviceRequest;
import com.eldercare.model.DeviceToken;
import com.eldercare.model.SystemConfig;
import com.eldercare.model.User;
import com.eldercare.repository.DeviceTokenRepository;
import com.eldercare.repository.SystemConfigRepository;
import com.eldercare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * DeviceService – Quản lý thiết bị đăng nhập.
 * 
 * Liên quan đến chức năng 4: Quản lý thiết bị đăng nhập.
 * Chịu trách nhiệm lưu trữ Expo Push Token, lịch sử đăng nhập thiết bị,
 * và thu hồi (revoke) thiết bị vượt giới hạn theo cấu hình.
 */
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;
    private final SystemConfigRepository systemConfigRepository;

    /**
     * Lấy danh sách các thiết bị CÒN HOẠT ĐỘNG (chưa bị thu hồi).
     * Sắp xếp ưu tiên những thiết bị được sử dụng (lastSeenAt) gần đây nhất lên đầu.
     */
    public List<DeviceToken> listMyDevices(Long userId) {
        return deviceTokenRepository.findByUserIdAndRevokedAtIsNull(userId).stream()
                .sorted(Comparator.comparing(DeviceToken::getLastSeenAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
    }

    /**
     * Đăng ký thiết bị nhận Push Notification. (Hàm chạy kiểu upsert)
     * - Nếu token của thiết bị đã có trong CSDL: Cập nhật thông tin và cập nhật ngày cuối hoạt động.
     * - Nếu chưa có: Tạo mới.
     * Sau khi đăng ký, tự động kiểm tra số lượng thiết bị của tài khoản.
     */
    @Transactional
    public DeviceToken register(Long userId, RegisterDeviceRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        String token = req.getToken().trim();

        // Upsert: Tìm cũ hoặc tạo mới
        DeviceToken dt = deviceTokenRepository.findByUserIdAndToken(userId, token)
                .orElse(DeviceToken.builder().user(user).token(token).build());
        
        dt.setPlatform(req.getPlatform());
        dt.setDeviceInfo(req.getDeviceInfo());
        dt.setLastSeenAt(LocalDateTime.now());
        dt.setRevokedAt(null); // Kích hoạt lại thiết bị nếu trước đó đã bị thu hồi
        dt = deviceTokenRepository.save(dt);

        // Đảm bảo không quá số thiết bị tối đa cho phép
        enforceMaxDevices(userId);
        return dt;
    }

    /**
     * Thu hồi quyền của một thiết bị.
     * Cơ sở dữ liệu sẽ không xóa, chỉ gán thời điểm revokedAt (cờ hiệu bị vô hiệu hóa).
     */
    @Transactional
    public void revokeMyDevice(Long userId, Long deviceId) {
        DeviceToken dt = deviceTokenRepository.findByIdAndUserId(deviceId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị"));
        dt.setRevokedAt(LocalDateTime.now());
        deviceTokenRepository.save(dt);
    }

    /**
     * Giới hạn số lượng thiết bị đăng nhập đồng thời của mỗi tài khoản.
     * Cấu hình max_devices_per_user được lấy động từ CSDL.
     * Nếu tài khoản đăng nhập trên thiết bị thứ N+1, hệ thống sẽ tự động THU HỒI
     * thiết bị cũ nhất chưa bị thu hồi.
     */
    private void enforceMaxDevices(Long userId) {
        int max = getIntConfig("max_devices_per_user", 5);
        if (max <= 0) return;
        
        // Lấy các thiết bị đang hoạt động, xếp theo thứ tự mới dùng nhất đến lâu nhất
        List<DeviceToken> active = deviceTokenRepository.findByUserIdAndRevokedAtIsNull(userId).stream()
                .sorted(Comparator.comparing(DeviceToken::getLastSeenAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
        
        if (active.size() <= max) return;

        // Cắt lấy đoạn đuôi (những thiết bị cũ vượt giới hạn)
        List<DeviceToken> toRevoke = active.subList(max, active.size());
        LocalDateTime now = LocalDateTime.now();
        
        // Thu hồi
        for (DeviceToken dt : toRevoke) {
            dt.setRevokedAt(now);
            deviceTokenRepository.save(dt);
        }
    }

    /**
     * Lấy giá trị số từ cấu hình hệ thống (bảng system_config), có fallback.
     */
    private int getIntConfig(String key, int defaultVal) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(SystemConfig::getConfigValue)
                    .map(String::trim)
                    .filter(v -> !v.isEmpty())
                    .map(Integer::parseInt)
                    .orElse(defaultVal);
        } catch (Exception e) {
            return defaultVal;
        }
    }
}
