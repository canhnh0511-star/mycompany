package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * GET /api/v1/production-summary/daily (Spec 2 §9/§13, MUST). {@code totalKg} LUÔN có mặt — audit
 * Phase 4 xác nhận business ĐÃ cộng trực tiếp kg các loại mủ thành tổng trong ReportService/export
 * thật (không phải mockup, xem docs/plans/0021... phần audit câu 8) nên không cần ẩn theo Spec 2 §10.
 * Khi có {@code latexTypeCode} filter, {@code totalKg}/{@code byLatexType} chỉ phản ánh đúng 1 loại
 * đó (Spec 2 §21 — filter chỉ đổi projection).
 */
public record ProductionSummaryDailyResponse(
        LocalDate workDate,
        BigDecimal totalKg,
        List<LatexTypeKg> byLatexType,
        // true nếu có Tổ nào KHÔNG ở Case A(chưa có)/E(đã xong) — tức còn việc cần Admin xử lý
        // (Spec 2 §31/§48 "⚠ Còn dữ liệu chưa hoàn tất").
        boolean hasPendingIssues,
        List<TeamProductionSummary> teams) {
}
