package com.mycompany.api.dto;

import java.time.Instant;
import java.util.UUID;

/** performedBy = "SYSTEM" (literal) khi performedBySystem=true — xem entity ScanBatchAuditLog. */
public record ScanBatchAuditLogResponse(
        UUID id,
        UUID scanImageId,
        String action,
        String performedBy,
        Instant performedAt,
        String oldValue,
        String newValue,
        UUID sourceBatchId,
        UUID targetBatchId) {
}
