package com.mycompany.api.repository;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Projection thô cho {@link ProductionRecordItemRepository#aggregateForReport} — 1 dòng / (nhân
 * viên, loại mủ) đã cộng tổng kg trong kỳ. ReportService pivot thành ma trận (docs/TASKS.md Phase 4).
 */
public record ProductionAggregateRow(
        UUID employeeId, String employeeName, UUID teamId, String teamName, String latexTypeCode, BigDecimal totalKg) {
}
