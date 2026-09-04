package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSale;
import com.mycompany.api.entity.RecordStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// JpaSpecificationExecutor — filter động cho GET list (docs/TASKS.md Phase 4), xem LatexSaleSpecifications.
public interface LatexSaleRepository extends JpaRepository<LatexSale, UUID>, JpaSpecificationExecutor<LatexSale> {

    // 0021-scan-batch-model — trace/reparent record theo ScanImage/ScanBatch.
    List<LatexSale> findByScanImageId(UUID scanImageId);

    List<LatexSale> findByScanBatchIdAndStatus(UUID scanBatchId, RecordStatus status);

    // Home dashboard work-queue — đếm cùng production_records DRAFT+low_confidence_fields cần Admin
    // kiểm tra (CLAUDE.md §5).
    long countByRecordDateAndStatusAndLowConfidenceFieldsIsNotNull(LocalDate recordDate, RecordStatus status);

    // recent-documents — gộp chung với production_records theo created_at ASC, xem ghi chú tương ứng
    // ở ProductionRecordRepository.
    List<LatexSale> findByRecordDateAndStatusNotOrderByCreatedAtAsc(LocalDate recordDate, RecordStatus status);
}
