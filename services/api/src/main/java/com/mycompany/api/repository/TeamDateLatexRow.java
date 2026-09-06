package com.mycompany.api.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Projection thô cho {@link ProductionRecordItemRepository#aggregateTeamDateLatex} — 1 dòng /
 * (Tổ, ngày, loại mủ) đã cộng tổng kg (CHỈ record APPROVED). ProductionDashboardService pivot thành
 * heatmap cell (Tổ x ngày) và cơ cấu sản lượng theo loại mủ (donut).
 */
public record TeamDateLatexRow(
        UUID teamId, String teamName, LocalDate recordDate, String latexTypeCode, BigDecimal totalKg) {
}
