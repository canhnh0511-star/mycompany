package com.mycompany.api.dto;

import java.time.Instant;
import java.util.UUID;

public record EmployeeResponse(
        UUID id,
        String fullName,
        UUID teamId,
        String teamName,
        UUID userId,
        String status,
        // nullable — vợ/chồng cùng làm cạo mủ (CLAUDE.md §5); spouseEmployeeName chỉ để hiển thị.
        UUID spouseEmployeeId,
        String spouseEmployeeName,
        Instant createdAt) {
}
