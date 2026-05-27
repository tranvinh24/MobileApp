# Tài liệu kiến trúc và luồng nghiệp vụ — ElderCare

Tài liệu này dùng để:

- học code theo luồng thực tế frontend + backend
- hiểu thuật toán/ràng buộc nghiệp vụ
- thuyết trình báo cáo có dẫn chứng code

Phạm vi dựa trên code hiện có trong repo.

---

## Mục lục

1. [Điểm danh hằng ngày](#1-điểm-danh-hằng-ngày)
2. [Cập nhật trạng thái hoạt động (last active)](#2-cập-nhật-trạng-thái-hoạt-động-last-active)
3. [Nút khẩn cấp SOS](#3-nút-khẩn-cấp-sos)
4. [Admin: quản lý người dùng hệ thống](#4-admin-quản-lý-người-dùng-hệ-thống)
5. [Admin: quản lý cấu hình hệ thống](#5-admin-quản-lý-cấu-hình-hệ-thống)
6. [Tìm nhà thuốc gần nhất](#6-tìm-nhà-thuốc-gần-nhất)
7. [Checklist thuyết trình nhanh](#7-checklist-thuyết-trình-nhanh)
8. [Bảng file tham chiếu](#8-bảng-file-tham-chiếu)

---

## 1. Điểm danh hằng ngày

### 1.1. Bức tranh tổng thể

Có 3 phần cần phân biệt rõ khi báo cáo:

1. **Điểm danh chủ động (`ACTIVE`)**: người dùng bấm nút.
2. **Điểm danh thụ động (`PASSIVE`)**: backend có hỗ trợ kiểu dữ liệu/API nhưng chưa thấy job tự động tạo.
3. **Cảnh báo chưa điểm danh**: scheduler quét sau giờ hạn để tạo cảnh báo `NO_CHECKIN`.

### 1.2. API nhận điểm danh

Code backend map `type` sang enum ở `CheckInController`:

```java
@PostMapping
public ResponseEntity<ApiResponse<CheckInDto>> create(@RequestBody Map<String, Object> body) {
    Long elderlyId = Long.valueOf(body.get("elderlyId").toString());
    String typeStr = (String) body.get("type");
    CheckInType type = typeStr != null && typeStr.equals("PASSIVE")
            ? CheckInType.PASSIVE
            : CheckInType.ACTIVE;
    String notes = (String) body.get("notes");
    BigDecimal lat = body.get("latitude") != null ? new BigDecimal(body.get("latitude").toString()) : null;
    BigDecimal lng = body.get("longitude") != null ? new BigDecimal(body.get("longitude").toString()) : null;

    CheckIn checkIn = checkInService.createCheckIn(elderlyId, type, notes, lat, lng);
    return ResponseEntity.ok(ApiResponse.success(CheckInDto.fromEntity(checkIn)));
}
```

### 1.3. Thuật toán `createCheckIn` (trọng tâm)

Ở `CheckInService.createCheckIn`, flow nghiệp vụ:

```java
LocalDate today = LocalDate.now();
LocalDateTime startOfDay = today.atStartOfDay();
LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

if (checkInRepository.findFirstByElderlyIdAndCheckedAtBetweenOrderByCheckedAtDesc(
        elderlyId, startOfDay, endOfDay).isPresent()) {
    throw new RuntimeException("Bạn đã điểm danh hôm nay rồi. Mỗi ngày chỉ điểm danh 1 lần.");
}
```

Ý nghĩa:

- giới hạn **1 check-in/ngày/người cao tuổi**
- áp dụng cho cả `ACTIVE` và `PASSIVE` (vì dùng chung service)

Sau khi lưu thành công:

```java
elderlyProfileRepository.findByUserId(elderlyId).ifPresent(profile -> {
    profile.setLastCheckinAt(LocalDateTime.now());
    profile.setLastActiveAt(LocalDateTime.now());
    if (lat != null && lng != null) {
        profile.setLatitude(lat);
        profile.setLongitude(lng);
    }
    elderlyProfileRepository.save(profile);
});
```

Rồi phát realtime qua STOMP cho NCT và caregiver:

```java
CheckInDto dto = CheckInDto.fromEntity(checkIn);
messagingTemplate.convertAndSend("/topic/checkins/" + elderlyId, dto);
elderlyCaregiverRepository.findByElderly(elderly).forEach(link ->
        messagingTemplate.convertAndSend("/topic/checkins/" + link.getCaregiver().getId(), dto)
);
```

### 1.4. Frontend gọi điểm danh chủ động

`ElderlyHomeScreen`:

```javascript
const handleCheckIn = async () => {
  try {
    await create(user.id, 'ACTIVE', 'Điểm danh chủ động', null, null);
    showAlert({ title: 'Thành công', message: 'Đã điểm danh an toàn', type: 'success', onConfirm: load });
  } catch (e) {
    const msg = e.response?.data?.message || 'Không thể điểm danh';
    showAlert({ title: 'Lỗi', message: msg, type: 'error' });
  }
};
```

### 1.5. Điểm danh thụ động (`PASSIVE`) — trạng thái hiện tại

**Đã có:**

- enum `PASSIVE`
- API nhận `type=PASSIVE`
- config DB `passive_checkin_interval_minutes`, `passive_checkin_timeout_minutes`

**Chưa thấy trong code hiện tại:**

- scheduler/service tự gọi `createCheckIn(... PASSIVE ...)` theo chu kỳ
- frontend gửi `PASSIVE`

=> Cách nói an toàn khi báo cáo:

> Hệ thống đã chuẩn bị tầng dữ liệu và API cho điểm danh thụ động, nhưng chưa hoàn tất luồng tự động vận hành theo chu kỳ.

### 1.6. Cảnh báo “chưa điểm danh”

`DailyCheckinAlertScheduler` chạy mỗi 10 phút:

```java
@Scheduled(fixedDelay = 600_000)
public void tick() {
    if (!getBoolConfig("daily_checkin_alert_enabled", true)) return;

    LocalTime deadline = parseTime(getConfig("daily_checkin_deadline_time").orElse("20:00"));
    int grace = getIntConfig("daily_checkin_grace_minutes", 30);
    LocalDateTime due = LocalDate.now().atTime(deadline).plusMinutes(grace);
    if (LocalDateTime.now().isBefore(due)) return;
    // ...
}
```

Nếu NCT chưa check-in trong ngày:

```java
alertService.createAlert(elderly.getId(), AlertType.NO_CHECKIN, title, message, null, null);
pushService.sendToUsers(targets, title, message,
        java.util.Map.of("type", "NO_CHECKIN", "elderlyId", elderly.getId()));
```

---

## 2. Cập nhật trạng thái hoạt động (last active)

### 2.1. Dữ liệu

Trong `elderly_profiles` có:

- `last_active_at`
- `last_checkin_at`
- `latitude`, `longitude`

### 2.2. Luồng cập nhật

Hiện tại, `last_active_at` được cập nhật ngay khi check-in thành công (đoạn code mục 1.3).

Điều này nghĩa là:

- “hoạt động gần nhất” đang gắn với hành vi check-in
- chưa phải heartbeat mọi thao tác trong app

### 2.3. Hiển thị

`ElderlyDetailScreen` hiển thị:

- “Hoạt động lúc cuối” (`lastActiveAt`)
- “Điểm danh lúc cuối” (`lastCheckinAt`)

---

## 3. Nút khẩn cấp SOS

### 3.1. Luồng frontend

`ElderlyHomeScreen`:

```javascript
const handleSos = async () => {
  if (sosSending) return;
  setSosSending(true);
  try {
    let lat = null;
    let lng = null;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) {
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    }
    await sendSos(user.id, lat, lng);
    showAlert({ title: 'Đã gửi', message: 'Đã gửi tín hiệu khẩn cấp đến người giám hộ', type: 'success' });
  } catch (e) {
    showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không thể gửi SOS', type: 'error' });
  } finally {
    setSosSending(false);
  }
};
```

### 3.2. Luồng backend

`AlertService.createAlert` tạo alert cho từng caregiver:

```java
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
    messagingTemplate.convertAndSend("/topic/alerts/" + caregiver.getId(), AlertDto.fromEntity(alert));
}
```

Riêng SOS sẽ push FCM:

```java
if (type == AlertType.SOS && !caregivers.isEmpty()) {
    pushService.sendToUsers(caregiverIds, title, locMsg,
            Map.of("type", "SOS", "elderlyName", elderly.getFullName(), "elderlyId", elderlyId,
                    "lat", lat != null ? lat.doubleValue() : 0, "lng", lng != null ? lng.doubleValue() : 0));
}
```

### 3.3. Edge case cần nêu

- Không cấp quyền vị trí vẫn gửi SOS được (lat/lng = null).
- Không có caregiver liên kết: sẽ không có người nhận cảnh báo.
- Có thể bấm nhiều lần nếu mạng lag; frontend đã chặn bằng `sosSending`.

---

## 4. Admin: quản lý người dùng hệ thống

### 4.1. Security

- `@PreAuthorize("hasRole('ADMIN')")` ở `AdminController`.
- `SecurityConfig` giới hạn `/api/admin/**` cho ADMIN.

### 4.2. API chính

- `GET /api/admin/users`: lấy danh sách user (ẩn `passwordHash`).
- `PUT /api/admin/users/{id}`: cập nhật `isActive` và/hoặc `role`.

Mẫu service:

```java
@Transactional
public User updateUser(Long id, Boolean isActive, UserRole role) {
    User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    if (isActive != null) user.setIsActive(isActive);
    if (role != null) user.setRole(role);
    user = userRepository.save(user);
    user.setPasswordHash(null);
    return user;
}
```

### 4.3. Frontend admin user

- `AdminUsersScreen`: search, filter role, toggle active.
- Gọi API qua `frontend/src/api/admin.js`.

---

## 5. Admin: quản lý cấu hình hệ thống

### 5.1. API

- `GET /api/admin/config`
- `PUT /api/admin/config`

### 5.2. Cách lưu

`AdminService.setConfig`:

```java
@Transactional
public SystemConfig setConfig(String key, String value, String description) {
    SystemConfig config = systemConfigRepository.findByConfigKey(key)
            .orElse(SystemConfig.builder().configKey(key).build());
    config.setConfigValue(value);
    if (description != null) config.setDescription(description);
    return systemConfigRepository.save(config);
}
```

### 5.3. Lưu ý quan trọng khi báo cáo

- Không phải key nào trong DB cũng đã có consumer trong code.
- Key dùng rõ cho điểm danh hằng ngày: `daily_checkin_alert_enabled`, `daily_checkin_deadline_time`, `daily_checkin_grace_minutes`.
- `passive_checkin_*` mới dừng ở seed + UI admin + API nhận kiểu `PASSIVE`.

---

## 6. Tìm nhà thuốc gần nhất

### 6.1. Kiến trúc

- Chạy ở frontend (`pharmacySearch.js`), không qua backend trung gian.
- Nguồn dữ liệu: Overpass API (OpenStreetMap).

### 6.2. Thuật toán

1. Query Overpass theo bán kính quanh `lat/lng`.
2. Parse danh sách node/way.
3. Tính khoảng cách Haversine.
4. Sort tăng dần theo khoảng cách.
5. Cắt top `limit`.

Code minh họa:

```javascript
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

```javascript
results.sort((a, b) => a.distance - b.distance);
return results.slice(0, limit);
```

### 6.3. Fallback và độ tin cậy

- Nếu không có nhà thuốc, app fallback sang bệnh viện/phòng khám.
- Có nhiều endpoint Overpass dự phòng (`OVERPASS_URLS`).
- Chất lượng phụ thuộc dữ liệu OSM ở khu vực.

---

## 7. Checklist thuyết trình nhanh

- Nói rõ ranh giới **đã triển khai** vs **đã chuẩn bị nhưng chưa chạy tự động**.
- Nhấn mạnh ràng buộc “1 điểm danh/ngày”.
- Trình bày scheduler NO_CHECKIN là cảnh báo sau hạn, không phải PASSIVE auto check-in.
- SOS có cả realtime WebSocket và push FCM.
- Nhà thuốc chạy frontend, dùng Overpass + Haversine.

---

## 8. Bảng file tham chiếu

| Chủ đề | Backend | Frontend |
|---|---|---|
| Điểm danh | `CheckInController`, `CheckInService`, `CheckInType`, `DailyCheckinAlertScheduler` | `ElderlyHomeScreen.js`, `api/checkIns.js` |
| Last active | `CheckInService`, `ElderlyProfile` | `ElderlyDetailScreen.js` |
| SOS | `AlertController`, `AlertService` | `ElderlyHomeScreen.js`, `api/alerts.js` |
| Admin users/config | `AdminController`, `AdminService`, `SystemConfigSeeder` | `AdminHomeScreen.js`, `AdminUsersScreen.js`, `AdminConfigScreen.js`, `api/admin.js` |
| Nhà thuốc | — | `services/pharmacySearch.js`, `ChatbotScreen.js` |

---

*Tài liệu cập nhật theo codebase hiện tại.*
