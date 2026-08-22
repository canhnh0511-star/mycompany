package com.mycompany.api.repository;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Create-or-merge/reuse thuật toán (0021-scan-batch-model, Spec 1 mục 2-3) đọc qua 2 finder này —
 * luôn gọi trong phạm vi pg_advisory_xact_lock ở service layer để tránh race giữa 2 request cùng
 * key (Case 19/26); unique index uq_scan_batches_primary_key / uq_scan_batches_supplement_active là
 * belt-and-suspenders nếu lock bị miss ở 1 code path khác sau này.
 */
public interface ScanBatchRepository extends JpaRepository<ScanBatch, UUID> {

    // PRIMARY non-CANCELLED mới nhất cho 1 LogicalBatchKey — dùng cho create-or-merge (Spec 1 mục 2).
    Optional<ScanBatch> findTopByDocumentTypeAndWorkDateAndTeamIdAndBatchTypeAndStatusNotOrderByCreatedAtDesc(
            OcrTargetType documentType, LocalDate workDate, UUID teamId, BatchType batchType, BatchStatus statusNot);

    // Supplement đang active cho 1 originalBatchId — dùng cho create-or-reuse (Spec 1 mục 3.2, Case 26/27).
    Optional<ScanBatch> findByOriginalBatchIdAndBatchTypeAndStatusIn(
            UUID originalBatchId, BatchType batchType, Collection<BatchStatus> statuses);

    List<ScanBatch> findByOriginalBatchIdAndBatchType(UUID originalBatchId, BatchType batchType);
}
