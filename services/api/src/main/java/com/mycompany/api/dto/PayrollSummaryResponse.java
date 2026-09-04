package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Khớp `GET /api/v1/payroll` (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). `locked` là cờ đơn
 * giản theo THÁNG, KHÔNG immutable — GET vẫn luôn trả số liệu tính từ dữ liệu nguồn mới nhất dù đã
 * khóa hay chưa (mục 2.4).
 */
public record PayrollSummaryResponse(
        String yearMonth,
        BigDecimal totalNetPay,
        int totalEmployees,
        int needsReviewCount,
        int missingDataCount,
        boolean locked,
        UUID lockedBy,
        Instant lockedAt,
        List<PayrollRowResponse> rows) {
}
