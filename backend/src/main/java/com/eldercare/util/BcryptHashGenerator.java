package com.eldercare.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Chạy class này để in ra BCrypt hash cho mật khẩu (dùng cho seed admin trong DB).
 * Chạy: mvn exec:java -Dexec.mainClass="com.eldercare.util.BcryptHashGenerator" -Dexec.args="admin123"
 */
public class BcryptHashGenerator {
    public static void main(String[] args) {
        String password = args.length > 0 ? args[0] : "admin123";
        String hash = new BCryptPasswordEncoder().encode(password);
        System.out.println("Password: " + password);
        System.out.println("BCrypt hash: " + hash);
        System.out.println("\nSQL: INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ('admin', '" + hash + "', 'Administrator', 'ADMIN', TRUE);");
    }
}
