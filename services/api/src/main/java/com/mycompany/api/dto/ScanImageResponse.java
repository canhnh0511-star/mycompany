package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ScanImageResponse(
        UUID id,
        String photoUrl,
        String status,
        String dateVerificationStatus,
        String dateResolution,
        LocalDate ocrDetectedDate,
        LocalDate effectiveWorkDate,
        UUID pendingMoveTargetBatchId,
        String errorMessage,
        Instant createdAt) {
}
