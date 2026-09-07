package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Chi tiết drill-down 1 công nhân (ProductionWorkerDrawer, spec §9.3) — tổng theo kỳ, ngày có dữ
 * liệu, breakdown theo loại mủ, lịch sử sản lượng theo ngày. KHÔNG phải hồ sơ nhân sự đầy đủ (spec
 * §9.3 "không cần profile nhân sự đầy đủ") — chỉ đủ cho drawer xem nhanh.
 */
public record ProductionWorkerDetailResponse(
        String employeeId,
        String employeeName,
        String teamName,
        LocalDate fromDate,
        LocalDate toDate,
        BigDecimal totalKg,
        int recordedDayCount,
        Map<String, BigDecimal> kgByLatexType,
        List<DailyTotalPoint> dailyTrend) {
}
