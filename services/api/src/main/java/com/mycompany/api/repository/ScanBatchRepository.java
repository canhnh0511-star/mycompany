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
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // JOIN FETCH team — buildResponse() (ScanBatchService) đọc batch.getTeam().getName() ở những chỗ
    // KHÔNG có @Transactional bao quanh (captureImage/get, xem javadoc ScanBatchService lý do không
    // @Transactional ở method orchestration cấp cao) + open-in-view=false → nếu team chỉ findById
    // thường (LAZY) thì proxy chưa init sẽ ném LazyInitializationException ngay khi hết session của
    // transaction con bên trong. Fetch sẵn ở đây để không phụ thuộc session còn mở hay không — phát
    // hiện lỗi 500 khi test thật trên iPhone (batch đã tồn tại từ ảnh trước, ảnh thứ 2 trở đi mới lộ
    // ra vì batch mới tạo có team được gán trực tiếp từ object đã load, không qua proxy).
    @Query("select b from ScanBatch b join fetch b.team where b.id = :id")
    Optional<ScanBatch> findByIdWithTeam(UUID id);

    // Danh sách batch "chờ xử lý" (BatchStatus.isPendingHumanAction()) — Home "Chờ kiểm tra"
    // (docs/module-1-1-frontend-redesign-progress.md, 2026-08-25). SỬA 2026-08-25 (2): ban đầu chỉ có
    // countByStatusIn (đếm số) — bấm vào card chỉ biết SỐ, không biết batch nào/ngày nào, phải mở tab
    // Sản lượng (chỉ xem được đúng 1 ngày) rồi tự dò từng ngày mới ra được batch tồn đọng, trải nghiệm
    // kém khi batch không thuộc hôm nay. Đổi hẳn sang trả DANH SÁCH — frontend tự suy ra count từ
    // list.length (không cần 2 API riêng) + biết đích xác batch nào để mở thẳng.
    // Sắp NGÀY CŨ NHẤT lên đầu — batch tồn đọng lâu nhất là việc cần xử lý gấp nhất.
    @Query("""
            SELECT new com.mycompany.api.repository.PendingScanBatchRow(
                b.id, b.team.id, b.team.name, b.documentType, b.workDate, b.status)
            FROM ScanBatch b
            WHERE b.status IN :statuses
            ORDER BY b.workDate ASC, b.createdAt ASC
            """)
    List<PendingScanBatchRow> findPending(@Param("statuses") Collection<BatchStatus> statuses);
}
