package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Khớp `GET /api/v1/payroll/{employeeId}` (docs/specs/spec-3-bang-luong-v1-draft.md mục 4).
 * technicalGrade tách riêng khỏi `lines` (không chỉ nằm trong nhãn dòng breakdown) — frontend cần
 * giá trị này để preselect đúng ô chọn hạng khi mở panel sửa, không nên tự parse ngược từ label. */
public record PayrollDetailResponse(
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        String yearMonth,
        List<PayrollLineItem> lines,
        String technicalGrade,
        BigDecimal totalPay,
        BigDecimal deduction,
        boolean deductionIsOverride,
        BigDecimal netPay,
        PayrollRowStatus rowStatus) {
}
