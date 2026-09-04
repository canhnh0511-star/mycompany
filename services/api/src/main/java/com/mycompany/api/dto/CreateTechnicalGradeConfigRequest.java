package com.mycompany.api.dto;

import com.mycompany.api.entity.TechnicalGrade;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Đơn giá "Hạng kỹ thuật" (Module 3 — Bảng lương) theo hạng A/B/C, time-versioned, chống chồng lấn
 * theo (grade, effective_from/to) như AllowanceConfig. unitPrice CỐ ĐỊNH/tháng — không nhân số
 * lượng gì. Xem docs/specs/spec-3-bang-luong-v1-draft.md mục 2.2.
 */
public record CreateTechnicalGradeConfigRequest(
        @NotNull TechnicalGrade grade,
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
