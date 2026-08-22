package com.mycompany.api.service;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.TeamRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Create-or-merge PRIMARY / create-or-reuse Supplement (Spec 1 mục 2-3), tách RIÊNG khỏi
 * {@link ScanBatchService} — KHÔNG phải để tổ chức code cho đẹp, mà vì lý do kỹ thuật bắt buộc:
 * {@code @Transactional} trên 2 method này chỉ có tác dụng khi gọi qua Spring AOP proxy (tức từ
 * MỘT BEAN KHÁC). {@link ScanBatchService#captureImage} và {@link ScanBatchService#resolveDate}
 * trước đây gọi thẳng {@code this.resolveOrCreateBatchForImage(...)} trong cùng class — self-
 * invocation bỏ qua proxy hoàn toàn, khiến {@code @Transactional} bị vô hiệu ở đúng những chỗ cần
 * advisory lock giữ suốt transaction nhất (Case 19/28, RULE 3b/14/17/18). Phát hiện khi viết
 * integration test Case 17-28 (0021-scan-batch-model) — xem ADR-0021 addendum.
 */
@Service
@RequiredArgsConstructor
public class ScanBatchCreationService {

    // Spec 1 mục 3.2 — status còn được coi là "Supplement đang active" (loại APPROVED/CANCELLED).
    private static final List<BatchStatus> ACTIVE_SUPPLEMENT_STATUSES = List.of(
            BatchStatus.DRAFT, BatchStatus.UPLOADING, BatchStatus.PROCESSING, BatchStatus.NEED_REVIEW,
            BatchStatus.READY_TO_APPROVE, BatchStatus.PARTIAL_FAILED, BatchStatus.FAILED);

    private final ScanBatchRepository scanBatchRepository;
    private final TeamRepository teamRepository;
    private final ScanBatchAuditLogService auditLogService;
    private final JdbcTemplate jdbcTemplate;

    // Advisory lock transaction-scoped (tự release lúc commit/rollback) — chặn 2 request đồng thời
    // cùng đọc "chưa có batch" rồi cùng tạo mới (Case 19). Unique index uq_scan_batches_primary_key
    // (migration 007) là belt-and-suspenders nếu lock bị miss ở 1 code path khác sau này.
    @Transactional
    public ScanBatch resolveOrCreateBatchForImage(OcrTargetType documentType, LocalDate workDate, UUID teamId, User currentUser) {
        acquireAdvisoryLock("primary", documentType.name(), workDate.toString(), teamId.toString());
        Optional<ScanBatch> existing = findLatestPrimary(documentType, workDate, teamId);
        if (existing.isEmpty()) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId));
            try {
                return scanBatchRepository.save(ScanBatch.builder()
                        .documentType(documentType).workDate(workDate).team(team).batchType(BatchType.PRIMARY)
                        .status(BatchStatus.DRAFT).createdBy(currentUser).build());
            } catch (DataIntegrityViolationException ex) {
                throw new ConflictException("Đã có phiên quét khác được tạo cho Tổ/ngày/loại phiếu này — thử lại");
            }
        }
        ScanBatch batch = existing.get();
        if (batch.getStatus().isMergeable()) {
            return batch;
        }
        if (batch.getStatus() == BatchStatus.FAILED) {
            throw new ConflictException("batch_id=" + batch.getId()
                    + " đang FAILED — cần \"Thử lại\" hoặc \"Hủy phiên này\" trước khi chụp tiếp");
        }
        if (batch.getStatus() == BatchStatus.APPROVED) {
            throw new ConflictException("batch_id=" + batch.getId()
                    + " đã APPROVED — dùng flow \"Bổ sung phiếu\" (Supplement), không tạo phiên mới");
        }
        throw new IllegalStateException("Unreachable — status=" + batch.getStatus());
    }

    @Transactional
    public ScanBatch resolveOrCreateSupplement(UUID originalBatchId, User currentUser) {
        acquireAdvisoryLock("supplement", originalBatchId.toString());
        Optional<ScanBatch> active = scanBatchRepository.findByOriginalBatchIdAndBatchTypeAndStatusIn(
                originalBatchId, BatchType.SUPPLEMENT, ACTIVE_SUPPLEMENT_STATUSES);
        if (active.isPresent()) {
            ScanBatch supplement = active.get();
            auditLogService.logByUser(supplement, null, "SUPPLEMENT_REUSED", currentUser);
            return supplement;
        }
        ScanBatch original = scanBatchRepository.findById(originalBatchId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_batch (PRIMARY) với id=" + originalBatchId));
        ScanBatch supplement;
        try {
            supplement = scanBatchRepository.save(ScanBatch.builder()
                    .documentType(original.getDocumentType()).workDate(original.getWorkDate()).team(original.getTeam())
                    .batchType(BatchType.SUPPLEMENT).originalBatch(original)
                    .status(BatchStatus.DRAFT).createdBy(currentUser).build());
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Đã có Supplement khác đang active cho PRIMARY này — thử lại");
        }
        auditLogService.logByUser(supplement, null, "SUPPLEMENT_CREATED", currentUser);
        return supplement;
    }

    // Public — ScanBatchService.lookup()/resolveDate() dùng chung (đọc thuần, không cần transaction
    // riêng, an toàn gọi cross-bean bình thường).
    public Optional<ScanBatch> findLatestPrimary(OcrTargetType documentType, LocalDate workDate, UUID teamId) {
        return scanBatchRepository.findTopByDocumentTypeAndWorkDateAndTeamIdAndBatchTypeAndStatusNotOrderByCreatedAtDesc(
                documentType, workDate, teamId, BatchType.PRIMARY, BatchStatus.CANCELLED);
    }

    private void acquireAdvisoryLock(String... keyParts) {
        int key1 = keyParts.length > 0 ? keyParts[0].hashCode() : 0;
        int key2 = String.join("|", keyParts).hashCode();
        jdbcTemplate.queryForObject("SELECT pg_advisory_xact_lock(?, ?)", (rs, rowNum) -> null, key1, key2);
    }
}
