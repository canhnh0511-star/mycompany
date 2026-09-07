package com.mycompany.api.repository;

import com.mycompany.api.entity.ConflictStatus;
import com.mycompany.api.entity.ConflictType;
import com.mycompany.api.entity.ScanBatchConflict;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScanBatchConflictRepository extends JpaRepository<ScanBatchConflict, UUID> {

    List<ScanBatchConflict> findByScanBatchIdOrderByCreatedAtAsc(UUID scanBatchId);

    // canApprove (Spec 1 mục 6/RULE 6,15) = rỗng khi gọi với (batchId, true, OPEN).
    List<ScanBatchConflict> findByScanBatchIdAndBlockingAndStatus(
            UUID scanBatchId, boolean blocking, ConflictStatus status);

    List<ScanBatchConflict> findByScanImageIdAndStatus(UUID scanImageId, ConflictStatus status);

    // Dashboard "Báo cáo sản lượng" §10.1.C ("OCR lệch tổng chưa xử lý") — conflict còn OPEN, lọc theo
    // ScanBatch.workDate trong khoảng ngày báo cáo (chứ không phải record_date của từng dòng, vì
    // conflict scope batch/ảnh không luôn gắn 1 record cụ thể).
    @Query("""
            SELECT c FROM ScanBatchConflict c
              JOIN c.scanBatch b
            WHERE c.conflictType = :conflictType
              AND c.status = com.mycompany.api.entity.ConflictStatus.OPEN
              AND b.workDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR b.team.id = :teamId)
            ORDER BY b.workDate DESC
            """)
    List<ScanBatchConflict> findOpenByTypeInRange(
            @Param("conflictType") ConflictType conflictType,
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate, @Param("teamId") UUID teamId);

    // Widget "Mức độ hoàn chỉnh dữ liệu" §11.1 ("N phiếu cần kiểm tra") — mọi conflict blocking còn
    // OPEN trong khoảng ngày (không riêng TOTAL_MISMATCH — đây là chỉ số tổng quát "cần Admin xem lại").
    @Query("""
            SELECT c FROM ScanBatchConflict c
              JOIN c.scanBatch b
            WHERE c.blocking = true
              AND c.status = com.mycompany.api.entity.ConflictStatus.OPEN
              AND b.workDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR b.team.id = :teamId)
            """)
    List<ScanBatchConflict> findOpenBlockingInRange(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate, @Param("teamId") UUID teamId);
}
