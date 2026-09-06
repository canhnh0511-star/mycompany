package com.mycompany.api.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Toàn bộ dữ liệu cho màn "Báo cáo sản lượng" dashboard (docs/specs — WEB UI SPEC — BÁO CÁO SẢN
 * LƯỢNG). Gộp 1 response cho cả 8 khối (spec §2) thay vì 8 endpoint riêng — cùng bộ filter
 * (fromDate/toDate/teamId), dataset nhỏ (1 công ty, theo tháng), tránh 8 round-trip network cho 1 lần
 * load dashboard. KHÔNG đụng tới {@link ProductionReportResponse} cũ (bảng đơn giản + export vẫn dùng
 * DTO đó nguyên vẹn).
 */
public record ProductionDashboardResponse(
        LocalDate fromDate,
        LocalDate toDate,
        LocalDate previousFromDate,
        LocalDate previousToDate,
        List<String> latexTypeCodes,
        Map<String, String> latexTypeLabels,
        ProductionDashboardSummary summary,
        List<ProductionTrendPoint> trend,
        List<RubberTypeProduction> rubberTypes,
        List<TeamPerformance> teamPerformance,
        List<TopWorker> topWorkers,
        List<ProductionAlert> alerts,
        ProductionDataCompleteness completeness,
        List<ProductionHeatmapCell> heatmap) {
}
