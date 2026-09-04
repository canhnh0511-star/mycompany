package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/** PATCH /api/v1/payroll/{employeeId}/deduction — sửa Trừ/Tạm ứng riêng cho 1 người/1 tháng, KHÔNG
 * đổi payroll_settings mặc định (docs/specs/spec-3-bang-luong-v1-draft.md mục 2.6). */
public record UpdateDeductionRequest(@NotNull @PositiveOrZero BigDecimal amount) {
}
