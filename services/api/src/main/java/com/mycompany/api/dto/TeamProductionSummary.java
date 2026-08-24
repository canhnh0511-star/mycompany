package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * 1 dòng "Theo tổ" trong GET /production-summary/daily (Spec 2 §13/§46-48). {@code primaryBatchId}
 * (nullable — Case A không có) để frontend điều hướng "Xử lý"/"Xem chi tiết" thẳng tới
 * scan-batch-review đúng phiên, không cần lookup lại.
 */
public record TeamProductionSummary(
        UUID teamId,
        String teamName,
        DerivedTeamStatus derivedStatus,
        UUID primaryBatchId,
        BigDecimal officialKg,
        // Không kèm "/N" — mục 14 Spec 2 (không có expectedWorkersForDate trong domain, xác nhận ở audit).
        int employeesWithProduction,
        List<PendingMoveInfo> pendingMoveInfo,
        ActiveSupplementInfo activeSupplementInfo) {
}
