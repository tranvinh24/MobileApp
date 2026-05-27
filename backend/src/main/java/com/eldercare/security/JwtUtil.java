package com.eldercare.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JwtUtil – Tiện ích tạo, xác thực và giải mã JSON Web Token (JWT).
 *
 * Liên quan đến:
 *   - Chức năng 2: Đăng nhập / đăng xuất (tạo token sau đăng nhập)
 *   - Chức năng 6: Phân quyền người dùng (nhúng role vào claim)
 *
 * Thuật toán ký: HMAC-SHA256 (HS256).
 * Cấu hình: jwt.secret và jwt.expiration trong application.properties.
 *
 * Cấu trúc JWT: header.payload.signature
 *   - header: {"alg":"HS256","typ":"JWT"}
 *   - payload: {"sub":email, "userId":id, "role":role, "iat":..., "exp":...}
 *   - signature: HMAC(base64(header) + "." + base64(payload), secret)
 */
@Component
public class JwtUtil {

    /** Secret key đọc từ application.properties – phải đủ dài (≥ 256 bit) */
    @Value("${jwt.secret}")
    private String jwtSecret;

    /** Thời gian sống của token (ms), mặc định 86400000 = 24 giờ */
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    /**
     * Tạo SecretKey từ chuỗi secret để ký JWT bằng HMAC-SHA256.
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Tạo JWT token sau khi xác thực thành công.
     *
     * Token nhúng: userId (để tránh query DB mỗi request) và role (để phân quyền).
     * Token được ký bằng HMAC-SHA256 với secret key.
     *
     * @param email  Email người dùng (subject của token)
     * @param userId ID người dùng trong DB
     * @param role   Vai trò: "ELDERLY" | "CAREGIVER" | "ADMIN"
     * @return Chuỗi JWT đã ký
     */
    public String generateToken(String email, Long userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration); // Hết hạn sau 24h

        return Jwts.builder()
                .subject(email)           // Subject = email người dùng
                .claim("userId", userId)  // Claim tuỳ chỉnh: ID người dùng
                .claim("role", role)      // Claim tuỳ chỉnh: vai trò (dùng cho phân quyền)
                .issuedAt(now)            // Thời điểm phát hành
                .expiration(expiryDate)   // Thời điểm hết hạn
                .signWith(getSigningKey()) // Ký bằng HMAC-SHA256
                .compact();
    }

    /**
     * Giải mã JWT và lấy email (subject) từ payload.
     *
     * @param token Chuỗi JWT
     * @return Email của người dùng
     */
    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey()) // Xác minh chữ ký
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject(); // Trả về email từ "sub"
    }

    /**
     * Giải mã JWT và lấy userId từ claim tuỳ chỉnh.
     * Dùng trong JwtAuthenticationFilter để inject CurrentUser.
     *
     * @param token Chuỗi JWT
     * @return ID người dùng
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("userId", Long.class); // Lấy claim "userId"
    }

    /**
     * Kiểm tra JWT có hợp lệ không (chữ ký đúng và chưa hết hạn).
     * Trả về false nếu token bị giả mạo, hết hạn hoặc sai định dạng.
     *
     * @param token Chuỗi JWT cần kiểm tra
     * @return true nếu hợp lệ, false nếu không
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token); // Ném exception nếu không hợp lệ
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // Token không hợp lệ
        }
    }
}
