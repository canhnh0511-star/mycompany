package com.mycompany.api.dto;

import com.mycompany.api.entity.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Full update — kể cả đổi status (active/inactive) và đổi team_id (docs/TASKS.md Phase 1). */
public record UpdateEmployeeRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotNull UUID teamId,
        @NotNull EmployeeStatus status,
        UUID userId) {
}
