# Tài Liệu Báo Cáo Chức Năng (Cá Nhân)
## Các chức năng đảm nhận:
1. Đăng ký tài khoản
2. Đăng nhập / đăng xuất
3. Quản lý hồ sơ cá nhân
4. Quản lý thiết bị đăng nhập
5. Thiết lập ngưỡng cảnh báo
6. Phân quyền người dùng (Người cao tuổi / Người giám hộ / Quản trị viên)
7. Cảnh báo khi không hoạt động trong thời gian dài
8. Ghi log cảnh báo an toàn

---

## Danh sách các file Code tương ứng

| Chức năng | Các File / Lớp liên quan | Vai trò / Giải thích |
|-----------|--------------------------|----------------------|
| **1. Đăng ký tài khoản** | - `AuthController.java` <br> - `AuthService.java` <br> - `UserRepository.java` <br> - `User.java` (Model) | Xử lý nhận request tạo tài khoản qua `register`. `AuthService` thực hiện validate (kiểm tra trùng lặp email, chặn đăng ký Admin), mã hoá password bằng BCrypt và lưu xuống Database qua `UserRepository`. |
| **2. Đăng nhập / Đăng xuất** | - `AuthController.java` <br> - `AuthService.java` <br> - `JwtUtil.java` <br> - `JwtAuthenticationFilter.java` <br> - `AuthContext.js` (Frontend) | API `login` trong `AuthController`. <br> `AuthService` xác thực thông qua Spring Security `AuthenticationManager`. <br> `JwtUtil` dùng để khởi tạo và sinh chuỗi JWT trả về client. <br> Ở các request sau, `JwtAuthenticationFilter` chặn request để validate Token. Đăng xuất được xử lý tại client bằng cách xóa Token (`AuthContext.js`). |
| **3. Quản lý hồ sơ cá nhân** | - `UserController.java` <br> - `UserService.java` <br> - `ElderlyProfile.java` <br> - `ElderlyProfileRepository.java` | Lấy/Cập nhật thông tin profile qua API `/api/users/profile/elderly/{userId}`. `UserService.updateElderlyProfile` hỗ trợ partial update (chỉ cập nhật trường có dữ liệu gửi lên) giúp tiện dụng cho client. |
| **4. Quản lý thiết bị đăng nhập**| - `DeviceController.java` <br> - `DeviceService.java` <br> - `DeviceToken.java` <br> - `DeviceTokenRepository.java` | API `/api/devices/register` lưu trữ Expo Push Token để nhận thông báo. Cấu trúc bảng `device_tokens` hỗ trợ lưu lịch sử truy cập (last_seen_at). Hàm `enforceMaxDevices` trong `DeviceService` giúp giới hạn số thiết bị theo cấu hình. |
| **5. Thiết lập ngưỡng cảnh báo** | - `AdminController.java` <br> - `AdminService.java` <br> - `SystemConfig.java` <br> - `SystemConfigRepository.java` | API cho phép Admin cấu hình động các thông số (như `passive_checkin_action_threshold`). Cấu trúc Key-Value linh hoạt qua bảng `system_config` giúp thay đổi thông số runtime mà không phải restart lại backend. |
| **6. Phân quyền người dùng** | - `SecurityConfig.java` <br> - `JwtAuthenticationFilter.java` <br> - Các `@PreAuthorize` annotations | Bảo mật ứng dụng. API Admin bắt buộc `hasRole('ADMIN')`. Security Context được `JwtAuthenticationFilter` thiết lập thông qua Claim `role` trích xuất từ JWT token, giảm thiểu lượt truy vấn xuống Database. |
| **7. Cảnh báo khi không hoạt động** | - `ActivityTrackingInterceptor.java` <br> - `PassiveCheckInTrackerService.java` <br> - `AppActivityLog.java` <br> - `AppActivityLogRepository.java` | `ActivityTrackingInterceptor` chặn tất cả các tương tác với API. Nếu thao tác hợp lệ (như POST/PUT), chuyển qua `PassiveCheckInTrackerService` ghi log. Khi số log đạt đến ngưỡng cấu hình (chức năng 5), hệ thống sẽ tự động gọi điểm danh thụ động (PASSIVE check-in). |
| **8. Ghi log cảnh báo an toàn** | - `AlertService.java` <br> - `Alert.java` <br> - `AlertRepository.java` <br> - `PushService.java` | Lưu cảnh báo bằng Model `Alert` (Bảng `alerts`). Hàm `createAlert` thực hiện lưu vào DB, đồng thời gửi thông báo realtime qua WebSocket (`SimpMessagingTemplate`) và gọi tới `PushService` đẩy Notification về điện thoại Người giám hộ. |

