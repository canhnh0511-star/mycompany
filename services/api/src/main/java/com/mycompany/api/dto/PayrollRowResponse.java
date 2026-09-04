package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 1 dòng nhân viên ở Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). Mọi field *Amount
 * đã nhân sẵn (quantity × đơn giá hiện hành) — frontend KHÔNG tự tính lại, chỉ hiển thị.
 * technicalGrade = null nghĩa là tháng này chưa được xếp hạng (không phải lỗi).
 */
public record PayrollRowResponse(
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        BigDecimal waterKg,
        BigDecimal waterAmount,
        BigDecimal mixedLatexKg,
        BigDecimal mixedLatexAmount,
        BigDecimal medicationCount,
        BigDecimal medicationAmount,
        BigDecimal attendanceDays,
        BigDecimal attendanceAmount,
        BigDecimal stormAllowanceDays,
        BigDecimal stormAllowanceAmount,
        BigDecimal seasonalWorkDays,
        BigDecimal seasonalWorkAmount,
        String technicalGrade,
        BigDecimal technicalGradeAmount,
        BigDecimal totalPay,
        BigDecimal deduction,
        boolean deductionIsOverride,
        BigDecimal netPay,
        PayrollRowStatus rowStatus) {
}
