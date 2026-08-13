package com.mycompany.api.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Projection thô cho {@link ProductionRecordItemRepository#aggregateDailyTotals} — 1 dòng / ngày đã
 * cộng tổng kg (chỉ những ngày CÓ dữ liệu; ngày trống do ReportService tự điền 0 khi ghép dải ngày liên
 * tục — xem ReportService#productionDailyTrend).
 */
public record DailyTotalRow(LocalDate recordDate, BigDecimal totalKg) {
}
