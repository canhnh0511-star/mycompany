package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * GET /api/v1/dashboard/kpis — khớp {@code DashboardKpis} phía FE
 * (apps/web/src/features/dashboard/model/dashboard.types.ts).
 *
 * <p>{@code costAmount}/{@code costCount}/{@code estimatedProfit} LUÔN null — Module 1 CHƯA có bảng
 * chi phí (costs), không tính/không bịa số liệu (CLAUDE.md mục 1 "Ngoài phạm vi Module 1"). Frontend
 * đã tự xử lý null này thành "Chưa có dữ liệu" (DashboardKpiGrid.tsx), không cần sửa thêm ở đó.
 */
public record DashboardKpisResponse(
        LocalDate workDate,
        BigDecimal productionKg,
        List<TeamProductionShareResponse> productionByTeam,
        Integer workforcePresent,
        // null nếu KHÔNG có nhân viên ACTIVE nào trong hệ thống (roster rỗng) — để frontend tự chuyển
        // hiển thị "N người có mặt" thay vì "N / 0" (xem workforceExpected != null ở DashboardKpiGrid.tsx).
        Integer workforceExpected,
        BigDecimal soldKg,
        BigDecimal soldRevenue,
        BigDecimal costAmount,
        Integer costCount,
        BigDecimal estimatedProfit,
        DashboardTrendsResponse trends) {
}
