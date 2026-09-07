package com.mycompany.api.dto;

import java.math.BigDecimal;

/**
 * 5 KPI cards của Dashboard "Báo cáo sản lượng" (spec §5). `null` ở các field "per..." /
 * "previousPeriodChange..." nghĩa là KHÔNG ĐỦ CƠ SỞ để tính (vd chưa có ngày nào có dữ liệu, hoặc kỳ
 * trước chưa có dữ liệu) — frontend hiển thị "Chưa đủ dữ liệu"/"—", KHÔNG hiển thị `0%` giả (spec §13).
 */
public record ProductionDashboardSummary(
        BigDecimal totalProductionKg,
        BigDecimal averagePerRecordedDayKg,
        BigDecimal averagePerWorkerKg,
        int recordedDayCount,
        int workerCount,
        int totalDaysInRange,
        int completedDayCount,
        BigDecimal previousPeriodChangePercent,
        BigDecimal previousPeriodChangeKg,
        boolean previousPeriodAvailable) {
}
