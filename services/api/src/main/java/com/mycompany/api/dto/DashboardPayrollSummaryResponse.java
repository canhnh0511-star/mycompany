package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /api/v1/dashboard/payroll-summary — khớp {@code PayrollSummaryData} phía FE.
 *
 * <p>Đổi tên từ {@code PayrollSummaryResponse} ban đầu (trùng tên với DTO của Module 3 Bảng lương
 * thật, GET /api/v1/payroll — {@link PayrollSummaryResponse}) khi 2 nhánh merge lại. 2 DTO khác mục
 * đích hoàn toàn: đây chỉ là 1 panel tóm tắt trên Home, DTO kia là toàn bộ dữ liệu bảng lương chi tiết.
 *
 * <p>{@code totalExpected} LUÔN null (nullable, khác bản gốc {@code number}) — panel Home này được
 * viết trước khi Module 3 tồn tại nên cố tình không bịa số VND giả; nay Module 3 đã có
 * {@code PayrollService} tính thật, có thể nối lại sau nếu cần, nhưng đó là việc khác, chưa làm ở đây.
 * {@code employeeCount}/{@code distribution}/{@code needsReviewCount} là dữ liệu THẬT.
 *
 * <p>{@code distribution} LUÔN trả đủ 4 bucket (kể cả count=0) — {@code pending_confirmation}/
 * {@code finalized} luôn 0 vì panel này chưa có workflow đó; giữ đủ 4 dòng để FE
 * (PayrollSummaryPanel.tsx) quyết định đúng vẽ donut hay progress summary dựa trên
 * {@code distribution.length}.
 */
public record DashboardPayrollSummaryResponse(
        String month,
        BigDecimal totalExpected,
        int employeeCount,
        int needsReviewCount,
        List<PayrollDistributionSliceResponse> distribution,
        String detailHref) {
}
