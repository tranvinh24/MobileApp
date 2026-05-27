-- ElderCare Database Schema - MySQL
CREATE DATABASE IF NOT EXISTS eldercare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eldercare;

-- Bảng người dùng
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('ELDERLY', 'CAREGIVER', 'ADMIN') NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng liên kết Người cao tuổi - Người giám hộ
CREATE TABLE IF NOT EXISTS elderly_caregiver (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_elderly_caregiver (elderly_id, caregiver_id)
);

-- Bảng thông tin bổ sung người cao tuổi
CREATE TABLE IF NOT EXISTS elderly_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    address VARCHAR(500),
    emergency_contact VARCHAR(255),
    medical_notes TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    last_active_at TIMESTAMP,
    last_checkin_at TIMESTAMP,
    fcm_token VARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng đơn thuốc
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255),
    notes TEXT,
    start_date DATE,
    end_date DATE,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng chi tiết thuốc trong đơn
CREATE TABLE IF NOT EXISTS medications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    unit VARCHAR(50),
    quantity INT DEFAULT 1,
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- Bảng lịch uống thuốc
CREATE TABLE IF NOT EXISTS medication_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medication_id BIGINT NOT NULL,
    time_of_day TIME NOT NULL,
    day_of_week VARCHAR(20) DEFAULT 'ALL',
    is_active BOOLEAN DEFAULT TRUE,
    reminder_minutes_before INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

-- Bảng lịch sử uống thuốc
CREATE TABLE IF NOT EXISTS medication_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medication_schedule_id BIGINT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    taken_at TIMESTAMP,
    reminded_at TIMESTAMP,
    status ENUM('PENDING', 'TAKEN', 'SKIPPED', 'MISSED') DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medication_schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE
);

-- Bảng điểm danh sức khỏe
CREATE TABLE IF NOT EXISTS check_ins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    check_in_type ENUM('ACTIVE', 'PASSIVE') NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng cảnh báo
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    alert_type ENUM('SOS', 'MISSED_MEDICATION', 'NO_CHECKIN', 'INACTIVE', 'OTHER') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng cấu hình hệ thống (Admin)
CREATE TABLE IF NOT EXISTS system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chat realtime: cuộc hội thoại giữa Người cao tuổi và Người giám hộ
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_conversation_pair (elderly_id, caregiver_id),
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat realtime: tin nhắn trong hội thoại (text/ảnh + AI note món ăn)
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    text TEXT,
    image_url VARCHAR(1000),
    ai_food_items_json TEXT,
    ai_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Push token / thiết bị đăng nhập (mở rộng thêm thông tin thiết bị + revoke)
-- (Nếu bảng device_tokens đã tồn tại, backend dùng JPA ddl-auto=update sẽ tự thêm cột tương ứng.)
ALTER TABLE device_tokens
    ADD COLUMN IF NOT EXISTS device_info VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL;

-- Hồ sơ sức khoẻ: các lần ghi chỉ số theo giai đoạn
CREATE TABLE IF NOT EXISTS health_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    elderly_id BIGINT NOT NULL,
    recorded_by BIGINT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    systolic INT,
    diastolic INT,
    heart_rate INT,
    blood_glucose DECIMAL(6,2),
    temperature DECIMAL(4,1),
    weight DECIMAL(6,2),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng thiết bị đăng nhập
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_token VARCHAR(500),
    device_info VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index cho truy vấn nhanh
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_elderly_caregiver_elderly ON elderly_caregiver(elderly_id);
CREATE INDEX idx_elderly_caregiver_caregiver ON elderly_caregiver(caregiver_id);
CREATE INDEX idx_prescriptions_elderly ON prescriptions(elderly_id);
CREATE INDEX idx_medications_prescription ON medications(prescription_id);
CREATE INDEX idx_check_ins_elderly ON check_ins(elderly_id);
CREATE INDEX idx_check_ins_checked_at ON check_ins(checked_at);
CREATE INDEX idx_alerts_caregiver ON alerts(caregiver_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_conversations_elderly ON conversations(elderly_id);
CREATE INDEX idx_conversations_caregiver ON conversations(caregiver_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_health_entries_elderly ON health_entries(elderly_id);
CREATE INDEX idx_health_entries_recorded_at ON health_entries(recorded_at);

-- Tài khoản admin: đăng nhập email "admin" / mật khẩu "admin123"
-- Nếu đăng nhập không được, tạo hash mới: trong thư mục backend chạy:
--   mvn exec:java -Dexec.mainClass="com.eldercare.util.BcryptHashGenerator" -Dexec.args="admin123"
-- rồi COPY dòng SQL in ra và chạy trong MySQL, hoặc: UPDATE users SET password_hash='<hash_in_ra>' WHERE email='admin';
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Administrator',
  'ADMIN',
  TRUE
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
