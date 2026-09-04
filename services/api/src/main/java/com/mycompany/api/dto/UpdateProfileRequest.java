package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cập nhật hồ sơ cá nhân (tên/avatar/chức vụ/SĐT) — không đổi email/mật khẩu/role qua endpoint này. */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        String avatarUrl,
        @Size(max = 100) String position,
        // Cùng pattern với phoneSchema ở apps/mobile/src/app/(auth)/login.tsx — 0xxxxxxxxx hoặc
        // +84xxxxxxxxx. Nullable (không bắt buộc phải có SĐT).
        @Pattern(regexp = "^(0|\\+84)\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone) {
}
