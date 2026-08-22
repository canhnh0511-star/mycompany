package com.mycompany.api.repository;

import com.mycompany.api.entity.ConflictStatus;
import com.mycompany.api.entity.ScanBatchConflict;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScanBatchConflictRepository extends JpaRepository<ScanBatchConflict, UUID> {

    List<ScanBatchConflict> findByScanBatchIdOrderByCreatedAtAsc(UUID scanBatchId);

    // canApprove (Spec 1 mục 6/RULE 6,15) = rỗng khi gọi với (batchId, true, OPEN).
    List<ScanBatchConflict> findByScanBatchIdAndBlockingAndStatus(
            UUID scanBatchId, boolean blocking, ConflictStatus status);

    List<ScanBatchConflict> findByScanImageIdAndStatus(UUID scanImageId, ConflictStatus status);
}
