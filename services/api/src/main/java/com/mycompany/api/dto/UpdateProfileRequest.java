package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cập nhật hồ sơ cá nhân (tên/avatar/chức vụ) — không đổi email/mật khẩu/role qua endpoint này. */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        String avatarUrl,
        @Size(max = 100) String position) {
}
