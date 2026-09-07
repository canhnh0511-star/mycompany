package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Đơn giá "hiện hành" đã dùng để tính `PayrollSummaryResponse` cho 1 tháng (mốc tham chiếu cuối
 * tháng — xem javadoc `PayrollService`) — CHỈ dùng để xuất Excel (hiển thị bảng đơn giá tường minh ở
 * đầu mỗi sheet + làm ô tham chiếu cho công thức "số lượng × đơn giá"), KHÔNG dùng lại cho tính
 * lương hiển thị trên web (route đó vẫn qua `PayrollRowResponse`/`PayrollDetailResponse` như cũ).
 *
 * <p>{@code gradeRates}: key = tên {@code TechnicalGrade} ("A"/"B"/"C").
 */
public record PayrollRateSnapshot(
        BigDecimal waterRate,
        BigDecimal mixedLatexRate,
        BigDecimal medicationRate,
        BigDecimal attendanceRate,
        BigDecimal stormRate,
        BigDecimal seasonalRate,
        Map<String, BigDecimal> gradeRates,
        BigDecimal defaultAdvance) {
}
