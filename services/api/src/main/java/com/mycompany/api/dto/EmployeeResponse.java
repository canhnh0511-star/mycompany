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
        Instant createdAt) {
}
