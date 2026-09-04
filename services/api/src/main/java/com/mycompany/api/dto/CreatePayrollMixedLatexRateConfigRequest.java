package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * "Mủ tạp" (Module 3 — Bảng lương) — đơn giá GỘP cho mủ chén + mủ dây + mủ đông, KHÔNG gắn
 * latex_type_id/code nào (khác RateConfig/AllowanceConfig) — chỉ 1 dòng hiệu lực tại 1 thời điểm
 * cho toàn hệ thống. Xem docs/specs/spec-3-bang-luong-v1-draft.md mục 2.1.
 */
public record CreatePayrollMixedLatexRateConfigRequest(
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
