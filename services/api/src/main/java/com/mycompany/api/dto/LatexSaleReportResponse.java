package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Report bán mủ theo Tổ (docs/TASKS.md Phase 4) — CHỈ tính bản ghi CONFIRMED. rows = 1 dòng/Tổ (đã
 * là mức Tổ, không cần subtotal riêng như report sản lượng cá nhân). Cùng shape này được
 * ExcelReportExportService/PdfReportExportService tái dùng để xuất file, không query lại.
 */
public record LatexSaleReportResponse(
        LocalDate fromDate,
        LocalDate toDate,
        List<String> latexTypeCodes,
        Map<String, String> latexTypeLabels,
        List<LatexSaleReportRow> rows,
        Map<String, BigDecimal> grandTotalByLatexType,
        BigDecimal grandTotalKg) {
}
