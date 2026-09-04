package com.mycompany.api.repository;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 1 dòng phẳng (team, employee, latexType) → tổng kg — nguồn cho toàn bộ tính toán Official
 * Production ở {@code ProductionSummaryService} (Phase 4, Spec 2). Dataset nhỏ (1 ngày, vài Tổ, vài
 * chục nhân viên) nên gộp cả 3 chiều group-by vào 1 query rồi pivot bằng Java, thay vì 3 query riêng
 * cho summary/team-breakdown/employee-count — cùng tinh thần {@code ProductionAggregateRow}.
 */
public record OfficialProductionRow(
        UUID teamId, String teamName, UUID employeeId, String latexTypeCode, BigDecimal kg) {
}
