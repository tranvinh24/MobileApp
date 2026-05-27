# Tài liệu Phân tích & Thiết kế Hệ thống — ElderCare

---

## 1. Hệ thống là gì? Hoạt động như thế nào?

**ElderCare** là ứng dụng di động chăm sóc sức khỏe người cao tuổi, gồm hai thành phần:

- **Frontend**: Expo React Native (chạy trên Android/iOS)
- **Backend**: Spring Boot REST API + WebSocket STOMP

### Hoạt động tổng thể

```
[Mobile App (Expo RN)]
        │  HTTP REST (axios)         │ WebSocket STOMP
        ▼                            ▼
[Spring Boot API :8082]  ←──── Realtime Push ────►  [Mobile App]
        │
        ▼
   [MySQL DB]  +  [Google Gemini AI]  +  [Firebase FCM]
```

Người dùng mở app → đăng nhập → nhận JWT token → gọi API (Bearer token). Backend xác thực JWT, xử lý nghiệp vụ, lưu MySQL, đẩy realtime qua STOMP topic và push notification qua FCM.

---

## 2. Các chức năng chính

| # | Chức năng | Vai trò |
|---|-----------|---------|
| 1 | Đăng ký / Đăng nhập / Đăng xuất | Tất cả |
| 2 | Phân quyền (ELDERLY / CAREGIVER / ADMIN) | Hệ thống |
| 3 | Quản lý hồ sơ cá nhân | ELDERLY, CAREGIVER |
| 4 | Quản lý thiết bị đăng nhập | Tất cả |
| 5 | Điểm danh hằng ngày | ELDERLY |
| 6 | Cảnh báo không hoạt động / SOS | ELDERLY → CAREGIVER |
| 7 | Nhắc uống thuốc & lịch sử | ELDERLY, CAREGIVER |
| 8 | Hồ sơ sức khỏe (health timeline) | CAREGIVER nhập, ELDERLY xem |
| 9 | Chat realtime (text + ảnh) | ELDERLY ↔ CAREGIVER |
| 10 | AI phân tích bữa ăn (Gemini) | CAREGIVER, ELDERLY |
| 11 | Tìm nhà thuốc gần nhất | Tất cả |
| 12 | Cấu hình hệ thống | ADMIN |
| 13 | Quản lý người dùng | ADMIN |

---

## 3. Công nghệ & Kỹ thuật

### Backend
| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Spring Boot 3.2 (Java 17) |
| Bảo mật | Spring Security + JWT (JJWT 0.12.3) |
| ORM | Spring Data JPA / Hibernate |
| Realtime | Spring WebSocket + STOMP |
| Push notification | Firebase Cloud Messaging (FCM) |
| AI | Google GenAI SDK (Gemini) |
| Build | Maven |
| Mã hóa mật khẩu | BCrypt (PasswordEncoder) |

### Frontend
| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Expo SDK 54 / React Native 0.81 |
| HTTP Client | Axios |
| WebSocket | @stomp/stompjs |
| Navigation | React Navigation v7 |
| Storage | AsyncStorage |
| Notifications | expo-notifications |
| Location | expo-location |
| Image Picker | expo-image-picker |

### Database
- **MySQL** — schema tĩnh, JPA ddl-auto=update
- Charset: `utf8mb4`
- Timezone: `Asia/Ho_Chi_Minh`

### Kỹ thuật nổi bật
- **JWT stateless auth**: token 24h, claims chứa `userId`, `role`
- **STOMP over WebSocket**: topic `/topic/alerts/{userId}`, `/topic/checkins/{userId}`, `/topic/conversations/{id}`, `/topic/med-history/{userId}`
- **Scheduled tasks**: Spring `@Scheduled` — chạy mỗi 10 phút quét cảnh báo
- **Passive check-in**: ghi `AppActivityLog` mỗi request của ELDERLY, sau N thao tác tự tạo PASSIVE check-in
- **system_config table**: cấu hình động không cần redeploy

---

## 4. Phân tích thiết kế tổng quan

### 4.1 Kiến trúc phân lớp (Backend)

```
Controller Layer   (REST endpoints, auth guard)
       │
Service Layer      (business logic, orchestration)
       │
Repository Layer   (Spring Data JPA interfaces)
       │
Model Layer        (JPA Entities + Enums)
       │
Database           (MySQL)
```

**Các package chính:**
- `controller/` — 10 controller: Auth, User, Admin, Alert, CheckIn, Device, Chat, Health, MedicationHistory, Prescription
- `service/` — 14 service
- `scheduler/` — DailyCheckinAlertScheduler, MedicationReminderScheduler
- `security/` — JwtUtil, JwtAuthenticationFilter, CustomUserDetailsService
- `model/` — 15 entity + enums

### 4.2 Kiến trúc Frontend

```
screens/           (23 màn hình, tổ chức theo vai trò)
src/api/           (11 file gọi REST)
src/context/       (AuthContext, state toàn cục)
src/services/      (pharmacySearch, STOMP client)
src/components/    (UI components dùng chung)
```

### 4.3 Sơ đồ luồng dữ liệu tổng quát

```
User Action (Frontend)
    → API call (axios + Bearer JWT)
    → JwtAuthenticationFilter (xác thực token)
    → SecurityConfig (kiểm tra role/permission)
    → Controller → Service → Repository → MySQL
    → Response JSON
    → (Nếu có realtime) SimpMessagingTemplate → STOMP Topic
    → (Nếu SOS/alert) PushService → FCM
```

---

## 5. Phân tích thiết kế từng chức năng

---

### 5.1 Đăng ký tài khoản

**Luồng:**
1. Frontend (`RegisterScreen.js`) gửi `POST /api/auth/register` với `{email, password, fullName, phone, role}`
2. `AuthController` → `AuthService.register()`
3. Kiểm tra email chưa tồn tại (`userRepository.existsByEmail`)
4. Chặn đăng ký role `ADMIN` (chỉ tạo thủ công qua DB)
5. Mã hóa mật khẩu bằng BCrypt: `passwordEncoder.encode(password)`
6. Lưu `User` entity → trả về JWT token + thông tin user

**Ràng buộc:**
- Email unique (DB constraint + service check)
- Role chỉ được `ELDERLY` hoặc `CAREGIVER`
- Tài khoản active mặc định (`is_active = true`)

**API:** `POST /api/auth/register`

---

### 5.2 Đăng nhập / Đăng xuất

**Đăng nhập:**
1. Frontend (`LoginScreen.js`) gửi `POST /api/auth/login` với `{email, password}`
2. `AuthService.login()` → `authenticationManager.authenticate()` (Spring Security)
3. Kiểm tra `user.isActive` — nếu bị khóa thì từ chối
4. Tạo JWT: `jwtUtil.generateToken(email, userId, role)` — hết hạn sau 24h (`jwt.expiration=86400000`)
5. Trả về token, lưu vào `AsyncStorage` phía frontend

**Đăng xuất:**
- Phía frontend: xóa token khỏi `AsyncStorage` (stateless, không invalidate server-side)
- Optionally: revoke device token để dừng FCM push

**API:** `POST /api/auth/login` | `GET /api/auth/me`

---

### 5.3 Phân quyền người dùng

**3 vai trò (enum `UserRole`):**

| Role | Mô tả | Quyền chính |
|------|--------|-------------|
| `ELDERLY` | Người cao tuổi | Điểm danh, xem thuốc, uống thuốc, SOS, chat |
| `CAREGIVER` | Người giám hộ | Quản lý thuốc, theo dõi NCT, nhận cảnh báo, chat |
| `ADMIN` | Quản trị viên | Quản lý user, cấu hình hệ thống, xem thống kê |

**Cơ chế phân quyền:**
- `JwtAuthenticationFilter`: đọc Bearer token từ header `Authorization`, extract claims (email, userId, role), set `SecurityContext`
- `SecurityConfig`: map URL pattern → role:
  - `/api/admin/**` → `ADMIN`
  - `/api/auth/**` → public
  - Còn lại → authenticated
- `@PreAuthorize("hasRole('ADMIN')")` bảo vệ method-level
- UI phân nhánh theo role sau đăng nhập (`App.js` đọc role → render stack khác nhau)

---

### 5.4 Quản lý hồ sơ cá nhân

**Gồm 2 phần:**

**a) Thông tin cơ bản (bảng `users`):**
- `fullName`, `phone`, `avatarUrl`, `email`
- API: `GET /api/users/{id}`, `PUT /api/users/{id}`
- Frontend: `AccountScreen.js`, `EditElderlyProfileScreen.js`

**b) Hồ sơ mở rộng người cao tuổi (bảng `elderly_profiles`):**
- `dateOfBirth`, `address`, `emergencyContact`, `medicalNotes`
- `latitude`, `longitude` — vị trí cập nhật khi check-in
- `lastActiveAt`, `lastCheckinAt` — thời điểm hoạt động cuối
- `fcmToken` — token push notification
- API: `GET /api/users/{id}/elderly-profile`, `PUT /api/users/{id}/elderly-profile`
- `UserService.getOrCreateElderlyProfile()` — tự tạo nếu chưa có

**Liên kết ELDERLY ↔ CAREGIVER:**
- Bảng `elderly_caregiver` (many-to-many)
- CAREGIVER tìm NCT qua email hoặc SĐT → `UserService.linkByEmail()` / `linkByPhone()`
- Màn hình: `LinkElderlyScreen.js`

---

### 5.5 Quản lý thiết bị đăng nhập

**Mục đích:** Lưu FCM token thiết bị, giới hạn số thiết bị đăng nhập, cho phép thu hồi (revoke).

**Luồng đăng ký thiết bị:**
1. Sau đăng nhập, frontend gửi `POST /api/devices/register` với `{token, platform, deviceInfo}`
2. `DeviceService.register()` — nếu token đã tồn tại thì cập nhật `lastSeenAt`, xóa `revokedAt`
3. Gọi `enforceMaxDevices()` — đọc config `max_devices_per_user` (mặc định 5), revoke thiết bị cũ nhất nếu vượt

**Luồng thu hồi thiết bị:**
- `DELETE /api/devices/{id}` → `DeviceService.revokeMyDevice()` — set `revokedAt = now`
- Thiết bị revoked không nhận FCM push

**Màn hình:** `DevicesScreen.js` hiển thị danh sách thiết bị active (`revokedAt IS NULL`), cho phép revoke

**Bảng:** `device_tokens` — `id, user_id, token, platform, device_info, created_at, last_seen_at, revoked_at`

**Config liên quan:** `max_devices_per_user` trong `system_config`

---

### 5.6 Cảnh báo khi không hoạt động trong thời gian dài

> **Lưu ý thiết kế:** Chức năng này được **điều khiển bởi cấu hình hệ thống** (Admin có thể bật/tắt và điều chỉnh ngưỡng qua `system_config`).

**Có 2 cơ chế cảnh báo không hoạt động:**

#### Cơ chế 1: Cảnh báo chưa điểm danh (`DailyCheckinAlertScheduler`)
- Scheduler chạy mỗi 10 phút (`@Scheduled(fixedDelay = 600_000)`)
- Đọc config: `daily_checkin_alert_enabled`, `daily_checkin_deadline_time` (mặc định `20:00`), `daily_checkin_grace_minutes` (mặc định 30)
- Nếu đã quá giờ hạn + grace period mà NCT chưa check-in → tạo alert `NO_CHECKIN` + push FCM

#### Cơ chế 2: Passive check-in (`PassiveCheckInTrackerService`)
- Mỗi request của ELDERLY → ghi `AppActivityLog`
- Sau mỗi N thao tác (config `passive_checkin_action_threshold`, mặc định 5) → tự tạo PASSIVE check-in
- Cập nhật `last_active_at` trong `elderly_profiles`

**Luồng nhận cảnh báo:**
- Backend → `AlertService.createAlert()` → lưu DB → push STOMP `/topic/alerts/{caregiverId}` + FCM
- Frontend: CAREGIVER nhận realtime, hiển thị trong `AlertsScreen.js`

---

### 5.7 Thiết lập ngưỡng cảnh báo

> **Thiết kế:** Đây là chức năng nằm trong **Cấu hình hệ thống** (Admin), không phải chức năng độc lập riêng biệt.

**Admin thiết lập qua `AdminConfigScreen.js`:**

| Config Key | Mô tả | Mặc định |
|------------|-------|----------|
| `daily_checkin_alert_enabled` | Bật/tắt cảnh báo chưa điểm danh | `true` |
| `daily_checkin_deadline_time` | Giờ hạn điểm danh | `20:00` |
| `daily_checkin_grace_minutes` | Thêm giờ chờ sau deadline | `30` |
| `passive_checkin_action_threshold` | Số thao tác để tạo passive check-in | `5` |
| `max_devices_per_user` | Giới hạn thiết bị mỗi tài khoản | `5` |
| `ai_provider` | Provider AI (`google`/`openai`) | `google` |
| `ai_google_api_key` | API key Gemini | — |
| `ai_google_model` | Model Gemini | `gemini-2.5-flash` |

**Cơ chế lưu:**
- API: `GET /api/admin/config`, `PUT /api/admin/config`
- `AdminService.setConfig(key, value)` — upsert vào bảng `system_config`
- Các service đọc config trực tiếp từ DB khi cần (không cache) → thay đổi có hiệu lực ngay

---

### 5.8 Ghi log cảnh báo an toàn

> **Thiết kế:** Gồm 2 loại log tương ứng 2 mục đích khác nhau, đều liên quan đến **Cấu hình hệ thống**.

#### Log hoạt động ứng dụng (`app_activity_logs`)
- Entity: `AppActivityLog` — `user_id, http_method, endpoint, created_at`
- Ghi bởi: `PassiveCheckInTrackerService.recordUserActivity()` mỗi khi ELDERLY gọi API
- Mục đích: theo dõi tần suất hoạt động, phục vụ passive check-in

#### Log cảnh báo an toàn (`alerts`)
- Entity: `Alert` — `elderly_id, caregiver_id, alert_type, title, message, latitude, longitude, is_read, created_at`
- Các loại cảnh báo (`AlertType`): `SOS`, `MISSED_MEDICATION`, `NO_CHECKIN`, `INACTIVE`, `OTHER`
- Ghi bởi: `AlertService.createAlert()` — mỗi cảnh báo tạo 1 bản ghi per caregiver
- Truy vấn: `GET /api/alerts/caregiver/{caregiverId}` — sắp xếp mới nhất, phân trang
- Đánh dấu đã đọc: `PATCH /api/alerts/{id}/read`
- Unread count dùng để hiển thị badge thông báo

---

## 6. Các thực thể (Entity) quan hệ tương ứng 8 chức năng

### 6.1 ERD tổng quan

```
users (id, email, password_hash, full_name, phone, role, avatar_url, is_active)
  │
  ├──[1:1]── elderly_profiles (user_id, date_of_birth, address, emergency_contact,
  │                            medical_notes, latitude, longitude,
  │                            last_active_at, last_checkin_at, fcm_token)
  │
  ├──[M:N via elderly_caregiver]── users (caregiver)
  │         (elderly_id, caregiver_id, linked_at, is_primary)
  │
  ├──[1:N]── device_tokens (user_id, token, platform, device_info,
  │                          created_at, last_seen_at, revoked_at)
  │
  ├──[1:N]── app_activity_logs (user_id, http_method, endpoint, created_at)
  │
  ├──[1:N]── check_ins (elderly_id, check_in_type[ACTIVE/PASSIVE],
  │                      checked_at, notes, latitude, longitude)
  │
  ├──[1:N]── alerts (elderly_id, caregiver_id, alert_type, title,
  │                   message, latitude, longitude, is_read, created_at)
  │
  └──[via system_config]── system_config (config_key, config_value, description)
```

### 6.2 Bảng thực thể theo chức năng

| Chức năng | Thực thể chính | Thực thể phụ |
|-----------|---------------|--------------|
| Đăng ký tài khoản | `users` | — |
| Đăng nhập / Đăng xuất | `users` | `device_tokens` |
| Phân quyền | `users` (role) | — |
| Quản lý hồ sơ | `users`, `elderly_profiles` | `elderly_caregiver` |
| Quản lý thiết bị | `device_tokens` | `users`, `system_config` |
| Cảnh báo không HĐ | `alerts`, `check_ins` | `elderly_profiles`, `elderly_caregiver` |
| Thiết lập ngưỡng | `system_config` | — |
| Ghi log cảnh báo | `alerts`, `app_activity_logs` | `users` |

### 6.3 Chi tiết từng thực thể

#### `users`
```
id             BIGINT PK AUTO_INCREMENT
email          VARCHAR(255) UNIQUE NOT NULL
password_hash  VARCHAR(255) NOT NULL
full_name      VARCHAR(255) NOT NULL
phone          VARCHAR(20)
role           ENUM('ELDERLY','CAREGIVER','ADMIN') NOT NULL
avatar_url     VARCHAR(500)
is_active      BOOLEAN DEFAULT TRUE
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

#### `elderly_profiles`
```
id                 BIGINT PK
user_id            BIGINT FK → users(id) UNIQUE
date_of_birth      DATE
address            VARCHAR(500)
emergency_contact  VARCHAR(255)
medical_notes      TEXT
latitude           DECIMAL(10,8)
longitude          DECIMAL(11,8)
last_active_at     TIMESTAMP      ← cập nhật khi check-in
last_checkin_at    TIMESTAMP      ← cập nhật khi check-in
fcm_token          VARCHAR(500)
```

#### `elderly_caregiver`
```
id            BIGINT PK
elderly_id    BIGINT FK → users(id)
caregiver_id  BIGINT FK → users(id)
linked_at     TIMESTAMP
is_primary    BOOLEAN DEFAULT FALSE
UNIQUE(elderly_id, caregiver_id)
```

#### `device_tokens`
```
id           BIGINT PK
user_id      BIGINT FK → users(id)
token        VARCHAR(512) NOT NULL     ← FCM token
platform     VARCHAR(20)               ← ios/android
device_info  VARCHAR(255)
created_at   TIMESTAMP
last_seen_at TIMESTAMP                 ← cập nhật mỗi lần đăng ký lại
revoked_at   TIMESTAMP NULL            ← NULL = còn active
```

#### `check_ins`
```
id              BIGINT PK
elderly_id      BIGINT FK → users(id)
check_in_type   ENUM('ACTIVE','PASSIVE') NOT NULL
checked_at      TIMESTAMP DEFAULT NOW
notes           TEXT
latitude        DECIMAL(10,8)
longitude       DECIMAL(11,8)
```

#### `alerts`
```
id           BIGINT PK
elderly_id   BIGINT FK → users(id)
caregiver_id BIGINT FK → users(id)
alert_type   ENUM('SOS','MISSED_MEDICATION','NO_CHECKIN','INACTIVE','OTHER')
title        VARCHAR(255) NOT NULL
message      TEXT
latitude     DECIMAL(10,8)
longitude    DECIMAL(11,8)
is_read      BOOLEAN DEFAULT FALSE
created_at   TIMESTAMP
```

#### `system_config`
```
id            BIGINT PK
config_key    VARCHAR(100) UNIQUE NOT NULL
config_value  TEXT
description   VARCHAR(255)
updated_at    TIMESTAMP
```

#### `app_activity_logs`
```
id          BIGINT PK
user_id     BIGINT FK → users(id)
http_method VARCHAR(10) NOT NULL    ← GET/POST/PUT/DELETE
endpoint    VARCHAR(255) NOT NULL   ← path API được gọi
created_at  TIMESTAMP NOT NULL
```

---

## 7. Ghi chú thiết kế quan trọng

1. **Chức năng 6, 7, 8 không tách biệt hoàn toàn** — chúng đều gắn với module **Cấu hình hệ thống (Admin)**:
   - Admin bật/tắt và điều chỉnh ngưỡng qua `system_config`
   - Scheduler (`DailyCheckinAlertScheduler`) đọc config trước mỗi lần chạy → thay đổi có hiệu lực ngay mà không cần restart

2. **Passive check-in đã được triển khai đầy đủ** trong `PassiveCheckInTrackerService` — ghi log hành vi, sau N thao tác tự tạo check-in PASSIVE, tránh NCT phải bấm tay mỗi ngày.

3. **Cảnh báo SOS** có 2 kênh song song: WebSocket (realtime trong app) + FCM (push kể cả khi app đóng).

4. **Stateless authentication**: JWT không lưu server-side. Đăng xuất chỉ xóa token phía client.

5. **Giới hạn thiết bị** (`max_devices_per_user`) điều khiển qua `system_config` — `DeviceService.enforceMaxDevices()` tự động revoke thiết bị ít dùng nhất khi vượt giới hạn.

---

*Tài liệu được tạo tự động dựa trên phân tích codebase — ElderCare v1.0.0*
