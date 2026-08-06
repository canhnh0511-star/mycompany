package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProductionRecordResponse(
        UUID id,
        LocalDate recordDate,
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        String notes,
        String source,
        String photoUrl,
        UUID ocrCallLogId,
        String lowConfidenceFields,
        UUID createdBy,
        Instant createdAt,
        String status,
        List<LatexItemResponse> items) {
}
