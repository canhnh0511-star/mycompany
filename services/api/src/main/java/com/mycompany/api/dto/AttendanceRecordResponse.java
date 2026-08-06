package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AttendanceRecordResponse(
        UUID id,
        LocalDate recordDate,
        UUID employeeId,
        String employeeName,
        String attendanceType,
        BigDecimal quantity,
        String notes,
        UUID createdBy,
        Instant createdAt,
        String status) {
}
