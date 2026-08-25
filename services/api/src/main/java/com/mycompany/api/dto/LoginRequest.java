package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * {@code identifier} nhận cả email lẫn số điện thoại (AuthController thử email trước, không thấy thử
 * phone) — không dùng {@code @Email} nữa vì field này không còn chỉ chứa email. Field JSON tên
 * {@code email} được GIỮ NGUYÊN (không đổi sang "identifier") để không phá tương thích ngược với các
 * client cũ đang gửi lên đúng key này; ý nghĩa đã mở rộng, xem javadoc.
 */
public record LoginRequest(
        @NotBlank String email,
        @NotBlank String password) {
}
