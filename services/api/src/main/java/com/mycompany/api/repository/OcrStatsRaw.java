package com.mycompany.api.repository;

import java.math.BigDecimal;

/**
 * Projection thô cho aggregate query {@link OcrCallLogRepository#aggregateStats}. Service
 * (OcrCallLogService) tính tiếp successRate/typeMismatchRate từ đây — xem docs/TASKS.md Phase 4.
 */
public record OcrStatsRaw(
        long totalCalls, long successCount, long typeMismatchCount, BigDecimal totalCostUsd, Double avgDurationMs) {
}
