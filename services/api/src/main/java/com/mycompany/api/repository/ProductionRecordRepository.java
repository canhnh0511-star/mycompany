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

    // Home dashboard work-queue/team-status — Tổ nào KHÔNG có trong list này ngày đó = "chưa có phiếu"
    // (dùng header table trực tiếp, không suy qua production_record_items — đúng nghĩa "không có
    // production_record active" dù header có/không có item nào).
    @Query("""
            SELECT DISTINCT pr.team.id
            FROM ProductionRecord pr
            WHERE pr.recordDate = :date
              AND pr.status <> com.mycompany.api.entity.RecordStatus.CANCELLED
            """)
    List<UUID> findDistinctTeamIdsWithActiveRecordOnDate(@Param("date") LocalDate date);

    // Home dashboard work-queue/team-status/recent-documents — record DRAFT + OCR đánh dấu field
    // không chắc chắn (CLAUDE.md §5), cần Admin xem lại trước khi confirm.
    List<ProductionRecord> findByRecordDateAndStatusAndLowConfidenceFieldsIsNotNull(
            LocalDate recordDate, RecordStatus status);

    // recent-documents — gộp chung với latex_sales theo created_at ASC để sinh mã phiếu ổn định
    // (xem DashboardService#buildDocumentEntries). Loại bỏ CANCELLED — "xóa" không hiện ở danh sách này.
    List<ProductionRecord> findByRecordDateAndStatusNotOrderByCreatedAtAsc(LocalDate recordDate, RecordStatus status);

    // payroll-summary distribution (CLAUDE.md — Module 1 chưa tính lương, chỉ đếm nhân viên có dữ liệu
    // thô hay chưa) — nhân viên ACTIVE có ít nhất 1 production_record active trong tháng -> "complete".
    @Query("""
            SELECT DISTINCT pr.employee.id
            FROM ProductionRecord pr
            WHERE pr.recordDate BETWEEN :from AND :to
              AND pr.status <> com.mycompany.api.entity.RecordStatus.CANCELLED
            """)
    List<UUID> findDistinctActiveEmployeeIdsInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // payroll-summary needsReviewCount — ước lượng đơn giản (chỉ tính production_record, không tính
    // latex_sales vì latex_sales không có employee_id — CLAUDE.md §5).
    @Query("""
            SELECT DISTINCT pr.employee.id
            FROM ProductionRecord pr
            WHERE pr.recordDate BETWEEN :from AND :to
              AND pr.status = com.mycompany.api.entity.RecordStatus.DRAFT
              AND pr.lowConfidenceFields IS NOT NULL
            """)
    List<UUID> findDistinctNeedsReviewEmployeeIdsInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
