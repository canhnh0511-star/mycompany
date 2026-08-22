package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// JpaSpecificationExecutor — filter động cho GET list (docs/TASKS.md Phase 4), xem ProductionRecordSpecifications.
public interface ProductionRecordRepository extends JpaRepository<ProductionRecord, UUID>,
        JpaSpecificationExecutor<ProductionRecord> {

    // Phản chiếu partial unique index uq_production_records_employee_date_active (001_init_schema.sql)
    // — 1 record ACTIVE (status <> cancelled) / employee / ngày. JPA không thể hiện được partial unique
    // index nên check tay ở service layer trước khi insert/update, tương tự RateConfigService.
    boolean existsByEmployeeIdAndRecordDateAndStatusNot(UUID employeeId, LocalDate recordDate, RecordStatus status);

    boolean existsByEmployeeIdAndRecordDateAndStatusNotAndIdNot(
            UUID employeeId, LocalDate recordDate, RecordStatus status, UUID id);

    // 0021-scan-batch-model — trace/reparent record theo ScanImage/ScanBatch.
    List<ProductionRecord> findByScanImageId(UUID scanImageId);

    List<ProductionRecord> findByScanBatchIdAndStatus(UUID scanBatchId, RecordStatus status);
}
