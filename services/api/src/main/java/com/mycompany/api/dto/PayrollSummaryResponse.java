package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /api/v1/dashboard/payroll-summary — khớp {@code PayrollSummaryData} phía FE.
 *
 * <p>{@code totalExpected} LUÔN null (nullable, khác bản gốc {@code number}) — tính lương thật cần
 * rate_configs + allowance_configs + attendance + production + logic tính lương, đó là việc của
 * Module 3 (CLAUDE.md mục 1 "Ngoài phạm vi Module 1"), CHƯA tồn tại ở đây. KHÔNG bịa số VND giả.
 * {@code employeeCount}/{@code distribution}/{@code needsReviewCount} là dữ liệu THẬT.
 *
 * <p>{@code distribution} LUÔN trả đủ 4 bucket (kể cả count=0) — {@code pending_confirmation}/
 * {@code finalized} luôn 0 vì Module 1 chưa có workflow đó; giữ đủ 4 dòng để FE
 * (PayrollSummaryPanel.tsx) quyết định đúng vẽ donut hay progress summary dựa trên
 * {@code distribution.length}.
 */
public record PayrollSummaryResponse(
        String month,
        BigDecimal totalExpected,
        int employeeCount,
        int needsReviewCount,
        List<PayrollDistributionSliceResponse> distribution,
        String detailHref) {
}
