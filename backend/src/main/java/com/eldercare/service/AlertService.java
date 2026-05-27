package com.eldercare.service;

import com.eldercare.model.Alert;
import com.eldercare.model.User;
import com.eldercare.model.enums.AlertType;
import com.eldercare.repository.AlertRepository;
import com.eldercare.repository.ElderlyCaregiverRepository;
import com.eldercare.repository.UserRepository;
import com.eldercare.dto.AlertDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AlertService – Dịch vụ ghi log và phân phối cảnh báo an toàn.
 * 
 * Liên quan đến chức năng 8: Ghi log cảnh báo an toàn.
 * Tạo và lưu trữ các cảnh báo (SOS, Không hoạt động, v.v.), gửi cảnh báo qua WebSocket 
 * tới người giám hộ đang online, và đẩy Push Notification khi cần.
 */
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final ElderlyCaregiverRepository elderlyCaregiverRepository;
    private final PushService pushService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Tạo cảnh báo, lưu vào DB và gửi đến người giám hộ.
     *
     * Quy trình:
     * 1. Tìm tất cả những người giám hộ (caregivers) đang theo dõi người cao tuổi này.
     * 2. Vòng lặp: Với mỗi người giám hộ, tạo riêng một bản ghi Alert vào CSDL.
     *    (Tạo riêng để có thể theo dõi trạng thái đã đọc isRead độc lập của mỗi người).
     * 3. Gửi ngay cảnh báo này qua WebSocket topic để cập nhật UI realtime.
     * 4. Nếu cảnh báo là loại khẩn cấp (SOS), kích hoạt gửi Push Notification tới tất cả thiết bị của người giám hộ.
     *
     * Bảng alerts được thiết kế theo kiểu "Append-only" (chỉ thêm, không xóa/sửa nội dung).
     */
    public Alert createAlert(Long elderlyId, AlertType type, String title, String message, BigDecimal lat, BigDecimal lng) {
        User elderly = userRepository.findById(elderlyId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người cao tuổi"));

        // Bước 1: Lấy danh sách người giám hộ
        List<User> caregivers = elderlyCaregiverRepository.findByElderly(elderly).stream()
                .map(ec -> ec.getCaregiver())
                .toList();

        Alert firstAlert = null;
        // Bước 2: Tạo riêng bản ghi cảnh báo cho từng người giám hộ
        for (User caregiver : caregivers) {
            Alert alert = Alert.builder()
                    .elderly(elderly)
                    .caregiver(caregiver)
                    .alertType(type)
                    .title(title)
                    .message(message)
                    .latitude(lat)
                    .longitude(lng)
                    .build();
            alert = alertRepository.save(alert);
            if (firstAlert == null) firstAlert = alert;

            // Bước 3: Gửi cảnh báo realtime qua WebSocket STOMP
            try {
                messagingTemplate.convertAndSend("/topic/alerts/" + caregiver.getId(), AlertDto.fromEntity(alert));
            } catch (Exception ignored) {}
        }

        // Bước 4: Gửi thông báo đẩy (Push Notification) nếu là khẩn cấp
        if (type == AlertType.SOS && !caregivers.isEmpty()) {
            String locMsg = message;
            if (lat != null && lng != null) {
                locMsg += " Vị trí: " + lat.stripTrailingZeros().toPlainString() + ", " + lng.stripTrailingZeros().toPlainString();
            }
            List<Long> caregiverIds = caregivers.stream().map(User::getId).collect(Collectors.toList());
            pushService.sendToUsers(caregiverIds, title, locMsg,
                    Map.of("type", "SOS", "elderlyName", elderly.getFullName(), "elderlyId", elderlyId,
                            "lat", lat != null ? lat.doubleValue() : 0, "lng", lng != null ? lng.doubleValue() : 0));
        }
        return firstAlert;
    }

    /**
     * Hàm tiện ích tạo nhanh cảnh báo SOS.
     */
    public Alert createSosAlert(Long elderlyId, BigDecimal lat, BigDecimal lng) {
        return createAlert(elderlyId, AlertType.SOS, "🆘 SOS Khẩn cấp",
                "Người cao tuổi đã bấm nút khẩn cấp. Vui lòng kiểm tra ngay!", lat, lng);
    }

    /**
     * Đọc log cảnh báo mới nhất của một người giám hộ (hỗ trợ phân trang/giới hạn số lượng).
     */
    public List<Alert> getAlertsByCaregiver(Long caregiverId, int limit) {
        return alertRepository.findByCaregiverIdOrderByCreatedAtDesc(caregiverId, PageRequest.of(0, limit));
    }

    /**
     * Đếm số lượng cảnh báo chưa đọc (để hiển thị badge thông báo).
     */
    public long getUnreadCount(Long caregiverId) {
        return alertRepository.countByCaregiverIdAndIsReadFalse(caregiverId);
    }

    /**
     * Đánh dấu cảnh báo là đã đọc (chỉ thay đổi cờ isRead, giữ nguyên nội dung log).
     */
    public void markAsRead(Long alertId) {
        alertRepository.findById(alertId).ifPresent(alert -> {
            alert.setIsRead(true);
            alertRepository.save(alert);
        });
    }
}
