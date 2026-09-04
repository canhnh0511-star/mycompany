package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Khớp `GET /api/v1/payroll/{employeeId}` (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). */
public record PayrollDetailResponse(
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        String yearMonth,
        List<PayrollLineItem> lines,
        BigDecimal totalPay,
        BigDecimal deduction,
        boolean deductionIsOverride,
        BigDecimal netPay,
        PayrollRowStatus rowStatus) {
}
