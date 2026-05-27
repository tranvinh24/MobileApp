package com.eldercare.config;

import com.eldercare.model.SystemConfig;
import com.eldercare.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SystemConfigSeeder implements ApplicationRunner {

    private final SystemConfigRepository systemConfigRepository;

    @Override
    public void run(ApplicationArguments args) {
        try {
            List<SystemConfig> defaults = Arrays.asList(
                    build("checkin_inactive_minutes", "30",
                            "Thời gian (phút) không có bất kỳ điểm danh nào trước khi tạo cảnh báo cho người giám hộ."),
                    build("passive_checkin_interval_minutes", "10",
                            "Khoảng cách (phút) giữa các lần hệ thống cố gắng điểm danh thụ động."),
                    build("passive_checkin_timeout_minutes", "3",
                            "Thời gian (phút) cho một lần điểm danh thụ động trước khi coi là thất bại."),
                    build("passive_checkin_action_threshold", "5",
                            "Số thao tác API (POST/PUT/PATCH/DELETE) của người cao tuổi để tự động tạo 1 điểm danh thụ động."),
                    build("max_caregivers_per_elderly", "3",
                            "Số người giám hộ tối đa được phép liên kết với một người cao tuổi."),
                    build("alert_escalation_missed_checkins", "3",
                            "Số lần liên tiếp bỏ lỡ điểm danh trước khi nâng mức độ cảnh báo."),
                    build("night_quiet_hours", "22:00-06:00",
                            "Khung giờ yên lặng ban đêm, chỉ gửi cảnh báo khẩn, giảm thông báo thường.")
                    ,
                    build("max_devices_per_user", "5",
                            "Số thiết bị đăng nhập tối đa cho mỗi tài khoản (vượt quá sẽ tự thu hồi thiết bị cũ)."),
                    build("med_reminder_enabled", "true",
                            "Bật/tắt nhắc uống thuốc bằng thông báo."),
                    build("med_reminder_default_minutes_before", "15",
                            "Mặc định nhắc trước bao nhiêu phút so với giờ uống thuốc (phút)."),
                    build("med_auto_mark_missed_minutes", "60",
                            "Sau bao nhiêu phút kể từ giờ uống mà chưa xác nhận thì tự đánh dấu MISSED (phút)."),
                    build("daily_checkin_alert_enabled", "true",
                            "Bật/tắt cảnh báo khi không điểm danh hằng ngày (gửi cho cả NCT và người giám hộ)."),
                    build("daily_checkin_deadline_time", "20:00",
                            "Hạn cuối điểm danh trong ngày (HH:mm). Quá giờ + ân hạn sẽ cảnh báo."),
                    build("daily_checkin_grace_minutes", "30",
                            "Ân hạn sau hạn cuối điểm danh trước khi tạo cảnh báo (phút)."),
                    build("ai_provider", "openai",
                            "Nhà cung cấp AI (vd: openai)."),
                    build("ai_api_key", "",
                            "API key AI (khuyến nghị dùng biến môi trường; nếu để ở đây cần bảo mật DB)."),
                    build("ai_openai_model", "gpt-4o-mini",
                            "OpenAI model (vd: gpt-4o-mini, gpt-4.1-mini)."),
                    build("ai_google_api_key", "",
                            "Google AI Studio (Gemini) API key. Khuyến nghị dùng biến môi trường; nếu lưu DB cần bảo mật."),
                    build("ai_google_model", "gemini-2.5-flash-latest",
                            "Gemini model (vd: gemini-1.5-flash, gemini-1.5-pro)."),
                    build("ai_food_prompt_template", "",
                            "Prompt template cho AI phân tích ảnh bữa ăn (để trống dùng mặc định)."),
                    build("chat_max_image_mb", "15",
                            "Giới hạn kích thước ảnh chat (MB) – dùng để hướng dẫn UI, backend vẫn kiểm soát bằng multipart.")
            );

            for (SystemConfig def : defaults) {
                systemConfigRepository.findByConfigKey(def.getConfigKey())
                        .ifPresentOrElse(
                                existing -> {
                                    // Không ghi đè giá trị đã được admin cấu hình
                                },
                                () -> {
                                    systemConfigRepository.save(def);
                                    log.info("Đã seed cấu hình hệ thống mặc định: {}", def.getConfigKey());
                                }
                        );
            }
        } catch (Exception e) {
            log.warn("SystemConfigSeeder: {}", e.getMessage());
        }
    }

    private SystemConfig build(String key, String value, String description) {
        return SystemConfig.builder()
                .configKey(key)
                .configValue(value)
                .description(description)
                .build();
    }
}

