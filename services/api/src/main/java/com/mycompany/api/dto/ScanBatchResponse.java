package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * canApprove = NOT EXISTS conflict WHERE blocking=true AND status='open' (Spec 1 mục 6/RULE 6,15)
 * — tính lại mỗi lần build response, không lưu DB.
 */
public record ScanBatchResponse(
        UUID id,
        String documentType,
        LocalDate workDate,
        UUID teamId,
        String teamName,
        String batchType,
        UUID originalBatchId,
        String status,
        boolean canApprove,
        UUID createdBy,
        Instant createdAt,
        UUID approvedBy,
        Instant approvedAt,
        List<ScanImageResponse> images,
        List<ScanBatchConflictResponse> conflicts) {
}
