package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // Module 3 (Bảng lương) — derive rowStatus (docs/specs/spec-3-bang-luong-v1-draft.md mục 2.5):
    // đếm số record theo (nhân viên, status) trong tháng, KHÔNG tính CANCELLED (cùng quy ước
    // aggregateForReport — record hủy không tồn tại về mặt nghiệp vụ). employeeId optional — dùng
    // chung cho cả summary (toàn Tổ) lẫn detail (1 nhân viên), cùng kiểu tham số với aggregateForReport.
    @Query("""
            SELECT new com.mycompany.api.repository.EmployeeRecordStatusRow(pr.employee.id, pr.status, COUNT(pr))
            FROM ProductionRecord pr
            WHERE pr.recordDate BETWEEN :fromDate AND :toDate
              AND pr.status <> com.mycompany.api.entity.RecordStatus.CANCELLED
              AND (:teamId IS NULL OR pr.team.id = :teamId)
              AND (:employeeId IS NULL OR pr.employee.id = :employeeId)
            GROUP BY pr.employee.id, pr.status
            """)
    List<EmployeeRecordStatusRow> countStatusByEmployee(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("teamId") UUID teamId, @Param("employeeId") UUID employeeId);
}
