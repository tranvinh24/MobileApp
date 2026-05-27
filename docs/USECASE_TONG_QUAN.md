# THÔNG TIN PHÂN TÍCH ĐỂ VẼ USE CASE TỔNG QUAN

Tài liệu này cung cấp các thông tin cần thiết (Định nghĩa Actor, Danh sách Use Case, và Mối quan hệ) để vẽ sơ đồ Use Case tổng quan cho 8 chức năng cốt lõi của hệ thống ElderCare.

---

## 1. Xác định các Tác nhân (Actors)

Để vẽ sơ đồ một cách khoa học, chúng ta cần xác định rõ ai/cái gì tương tác với hệ thống. Có 4 tác nhân chính:

1. **Người dùng chung (User):** Là tác nhân tổng quát (Actor trừu tượng). Các tác nhân cụ thể bên dưới sẽ kế thừa (Generalization) từ tác nhân này để dùng chung các chức năng cơ bản.
2. **Người cao tuổi (Elderly):** Người dùng ứng dụng để được theo dõi và nhắc nhở. (Kế thừa từ User).
3. **Người giám hộ (Caregiver):** Người thân dùng ứng dụng để theo dõi, nhận cảnh báo và quản lý hồ sơ cho người cao tuổi. (Kế thừa từ User).
4. **Quản trị viên (Admin):** Người vận hành ứng dụng, thiết lập hệ thống. (Kế thừa từ User).
5. **Hệ thống tự động (System / Scheduler):** Tác nhân hệ thống chạy ngầm, tự động thực thi các tác vụ kiểm tra thời gian, ghi log và phát thông báo.

---

## 2. Xác định các Use Case theo từng chức năng

Dưới đây là việc bóc tách 8 chức năng thành các "Use Case" cụ thể và gán cho các Actor tương ứng:

### Nhóm 1: Xác thực và Phân quyền
*Tác nhân chính: Người cao tuổi, Người giám hộ, Quản trị viên.*

- **UC1 - Đăng ký tài khoản:** Cho phép tạo tài khoản mới với vai trò là `Người cao tuổi` hoặc `Người giám hộ`. (Quản trị viên không tự đăng ký mà được cấp sẵn).
- **UC2 - Đăng nhập:** Yêu cầu bắt buộc để sử dụng ứng dụng.
- **UC3 - Đăng xuất:** Hủy phiên làm việc trên thiết bị.
- **UC4 - Quản lý / Phân quyền người dùng:** Chức năng dành riêng cho **Quản trị viên** để xem danh sách tài khoản, khóa/mở khóa tài khoản (Active/Deactive) và điều chỉnh vai trò (Role).

### Nhóm 2: Thông tin cá nhân & Thiết bị
*Tác nhân chính: Người cao tuổi, Người giám hộ.*

- **UC5 - Quản lý hồ sơ cá nhân cơ bản:** Cập nhật tên, ảnh đại diện, số điện thoại. (Dùng chung cho cả 2 vai trò).
- **UC6 - Cập nhật hồ sơ y tế mở rộng:** Cập nhật thông tin bệnh lý, liên hệ khẩn cấp. (Dành cho Người cao tuổi, hoặc Người giám hộ cập nhật giúp).
- **UC7 - Quản lý thiết bị đăng nhập:** Xem danh sách các thiết bị đang đăng nhập tài khoản.
- **UC8 - Thu hồi (Revoke) thiết bị:** Đăng xuất từ xa khỏi các thiết bị không còn sử dụng.

### Nhóm 3: Hệ thống & Cảnh báo an toàn
*Tác nhân chính: Quản trị viên, Hệ thống tự động, Người giám hộ.*

- **UC9 - Thiết lập ngưỡng cảnh báo:** **Quản trị viên** thiết lập các thông số (thời gian deadline điểm danh, số thao tác để tính là hoạt động) trên giao diện cấu hình (System Config).
- **UC10 - Kiểm tra trạng thái hoạt động:** **Hệ thống tự động** chạy định kỳ (mỗi 10 phút) để quét dữ liệu hoạt động của người cao tuổi so với *ngưỡng cảnh báo* đã thiết lập.
- **UC11 - Phát cảnh báo không hoạt động:** Nếu phát hiện quá giờ điểm danh hoặc quá lâu không thao tác, **Hệ thống tự động** sẽ phát cảnh báo đẩy (Push Notification/WebSocket) tới **Người giám hộ**.
- **UC12 - Ghi log cảnh báo an toàn:** Mỗi khi có sự kiện (Gửi SOS, Quá hạn điểm danh), **Hệ thống tự động** sẽ ghi lại bản ghi (Log/Alert) vào cơ sở dữ liệu.
- **UC13 - Xem lịch sử cảnh báo:** **Người giám hộ** vào ứng dụng để xem lại danh sách các cảnh báo (Log) đã nhận và đánh dấu là "đã đọc".

---

## 3. Các mối quan hệ (Relationships) trong sơ đồ

Khi lên hình sơ đồ, cần thể hiện các mũi tên quan hệ sau để sơ đồ đúng chuẩn UML:

**A. Quan hệ Kế thừa (Generalization):**
- Mũi tên mũi trắng (Tam giác rỗng) chỉ từ `Người cao tuổi`, `Người giám hộ`, `Quản trị viên` hướng về tác nhân `User`.
- -> *Ý nghĩa:* Tất cả đều là User, nên đều có quyền thực hiện **UC2 - Đăng nhập**, **UC3 - Đăng xuất**, **UC5 - Quản lý hồ sơ cá nhân**, **UC7 - Quản lý thiết bị**.

**B. Quan hệ Bao hàm (<<include>>):**
- **UC5 (Quản lý hồ sơ)**, **UC7 (Quản lý thiết bị)**, **UC4 (Phân quyền)** `--<<include>>-->` **UC2 (Đăng nhập)**.
  - -> *Ý nghĩa:* Phải đăng nhập mới dùng được các tính năng này.
- **UC8 (Thu hồi thiết bị)** `--<<include>>-->` **UC7 (Quản lý thiết bị)**.
  - -> *Ý nghĩa:* Muốn thu hồi thiết bị thì thao tác đó nằm trong bước xem danh sách thiết bị.
- **UC11 (Phát cảnh báo không hoạt động)** `--<<include>>-->` **UC12 (Ghi log cảnh báo an toàn)**.
  - -> *Ý nghĩa:* Bất cứ khi nào hệ thống phát cảnh báo, nó bắt buộc phải gọi hành động ghi log vào cơ sở dữ liệu.

**C. Quan hệ Mở rộng (<<extend>>):**
- **UC11 (Phát cảnh báo không hoạt động)** `--<<extend>>-->` **UC10 (Kiểm tra trạng thái hoạt động)**.
  - -> *Ý nghĩa:* Hành động kiểm tra trạng thái diễn ra liên tục, nhưng hành động "Phát cảnh báo" chỉ xảy ra (extend) **NẾU** thỏa điều kiện (người cao tuổi vi phạm ngưỡng thời gian).

---

## 4. Hướng dẫn cách vẽ lên sơ đồ Use Case

Để bản vẽ không bị quá rối, bạn nên chia làm **2 sơ đồ Use Case** riêng biệt cho báo cáo:

**Sơ đồ 1: Sơ đồ Quản lý Tài khoản & Hồ sơ (Nhóm 1, 2, 4, 5)**
- Đặt `User` ở giữa. Kéo các đường tới Đăng nhập, Đăng xuất, Quản lý hồ sơ, Quản lý thiết bị đăng nhập.
- `Người cao tuổi` và `Người giám hộ` kéo mũi tên kế thừa tới `User`. Đều có quyền Đăng ký tài khoản.
- `Quản trị viên` kéo mũi tên kế thừa tới `User`. Có đường riêng nối tới "Quản lý / Phân quyền người dùng".

**Sơ đồ 2: Sơ đồ Cảnh báo & Vận hành Hệ thống (Nhóm 6, 7, 8)**
- Đặt `Quản trị viên` bên trái: Nối tới "Thiết lập ngưỡng cảnh báo".
- Đặt `Hệ thống tự động` (hình chữ nhật có biểu tượng bánh răng hoặc người máy) ở giữa/phía dưới: Nối tới "Kiểm tra trạng thái hoạt động", "Phát cảnh báo", "Ghi log cảnh báo an toàn".
- Đặt `Người giám hộ` bên phải: Nối tới "Nhận cảnh báo" và "Xem lịch sử cảnh báo (Log)".
- Vẽ các nét đứt `<<include>>` và `<<extend>>` giữa các hành động của hệ thống như mô tả ở phần 3.
