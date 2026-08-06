package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** status mặc định 'active' — không nhập ở lúc tạo (CLAUDE.md §4: employees.status default active). */
public record CreateEmployeeRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotNull UUID teamId,
        // nullable — chỉ set khi nhân viên đồng thời là 1 User (vd Tổ trưởng tự cạo mủ)
        UUID userId) {
}
