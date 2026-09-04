package com.mycompany.api.dto;

import com.mycompany.api.entity.TechnicalGrade;

/** PATCH /api/v1/payroll/{employeeId}/technical-grade — xếp/đổi hạng riêng cho ĐÚNG tháng đang
 * xem (docs/specs/spec-3-bang-luong-v1-draft.md mục 2.2), KHÔNG ảnh hưởng tháng khác.
 * grade = null → xóa dòng gán (bỏ xếp hạng tháng đó, quay lại 0đ) — KHÔNG @NotNull. */
public record UpdateTechnicalGradeRequest(TechnicalGrade grade) {
}
