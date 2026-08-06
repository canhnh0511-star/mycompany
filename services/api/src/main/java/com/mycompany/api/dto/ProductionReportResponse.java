package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Report sản lượng cá nhân (docs/TASKS.md Phase 4) — CHỈ tính bản ghi CONFIRMED. rows sort theo
 * teamName rồi employeeName. latexTypeCodes/latexTypeLabels lấy từ toàn bộ danh mục LatexType (ổn
 * định kể cả loại mủ không phát sinh trong kỳ — danh mục mở, CLAUDE.md §4). Cùng shape này được
 * ExcelReportExportService/PdfReportExportService tái dùng để xuất file, không query lại.
 */
public record ProductionReportResponse(
        LocalDate fromDate,
        LocalDate toDate,
        List<String> latexTypeCodes,
        Map<String, String> latexTypeLabels,
        List<ProductionReportRow> rows,
        List<ProductionReportTeamSubtotal> teamSubtotals,
        Map<String, BigDecimal> grandTotalByLatexType,
        BigDecimal grandTotalKg) {
}
