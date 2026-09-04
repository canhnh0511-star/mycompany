package com.mycompany.api.repository;

import com.mycompany.api.entity.AttendanceType;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Projection thô cho {@link AttendanceRecordRepository#aggregateForPayroll} — 1 dòng / (nhân viên,
 * loại chấm công) đã cộng tổng quantity trong tháng. Dùng để tính lương (docs/specs/spec-3-bang-luong-v1-draft.md
 * mục 3) — PayrollService pivot thành các khoản bồi thuốc/chuyên cần/mưa bão/thời vụ.
 */
public record AttendanceAggregateRow(UUID employeeId, AttendanceType attendanceType, BigDecimal totalQuantity) {
}
