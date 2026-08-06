package com.mycompany.api.dto;

import java.math.BigDecimal;

/** Thống kê OCR (docs/TASKS.md Phase 4) — tỷ lệ thành công, chi phí ước tính, thời gian phản hồi trung bình. */
public record OcrCallLogStatsResponse(
        long totalCalls,
        long successCount,
        double successRate,
        long typeMismatchCount,
        double typeMismatchRate,
        BigDecimal totalEstimatedCostUsd,
        Double avgDurationMs) {
}
