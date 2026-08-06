package com.mycompany.api.dto;

import com.mycompany.api.entity.AttendanceType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpdateAttendanceRecordRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID employeeId,
        @NotNull AttendanceType attendanceType,
        @NotNull @Positive BigDecimal quantity,
        String notes) {
}
