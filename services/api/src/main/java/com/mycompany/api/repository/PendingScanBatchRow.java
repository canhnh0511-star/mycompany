package com.mycompany.api.repository;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.OcrTargetType;
import java.time.LocalDate;
import java.util.UUID;

/** Projection thô cho {@link ScanBatchRepository#findPending} — Home "Chờ kiểm tra" (2026-08-25). */
public record PendingScanBatchRow(
        UUID id, UUID teamId, String teamName, OcrTargetType documentType, LocalDate workDate, BatchStatus status) {
}
