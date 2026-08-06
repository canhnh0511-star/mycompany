package com.mycompany.api.dto;

import com.mycompany.api.entity.AttendanceType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 1 dòng trong request batch nhập tay (POST .../batch, ADR-0007). Không nhận status từ client —
 * nhập tay ghi thẳng status=confirmed (docs/TASKS.md Phase 2), khác PATCH sửa sau này.
 */
public record CreateAttendanceRecordRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID employeeId,
        @NotNull AttendanceType attendanceType,
        @NotNull @Positive BigDecimal quantity,
        String notes) {
}
