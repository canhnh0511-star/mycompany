package com.mycompany.api.service;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Recompute batch status (Spec 1 mục 5.2, RULE 16) — chạy sau MỌI sự kiện làm thay đổi trạng thái
 * ảnh trong 1 batch (thêm ảnh, upload xong, OCR xong, retry, resolve conflict, ảnh chuyển
 * PENDING_MOVE/MOVED/ACTIVE). KHÔNG có trạng thái nào được set thủ công/tĩnh mà bỏ qua recompute
 * — batch APPROVED/CANCELLED (terminal) là ngoại lệ duy nhất, không recompute nữa.
 */
@Service
@RequiredArgsConstructor
public class BatchStatusRecomputeService {

    private final ScanBatchRepository scanBatchRepository;
    private final ScanImageRepository scanImageRepository;
    private final ScanBatchConflictService conflictService;

    @Transactional
    public BatchStatus recompute(UUID batchId) {
        ScanBatch batch = scanBatchRepository.findById(batchId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_batch với id=" + batchId));
        if (batch.getStatus().isTerminal()) {
            return batch.getStatus();
        }

        // REPLACED (RULE 6, ảnh chụp lại) không còn là dữ liệu active — loại khỏi mọi tính toán.
        List<ScanImage> relevant = scanImageRepository.findByScanBatchId(batchId).stream()
                .filter(i -> i.getStatus() != ImageStatus.REPLACED)
                .toList();

        BatchStatus next;
        if (relevant.isEmpty()) {
            next = BatchStatus.DRAFT;
        } else if (relevant.stream().anyMatch(i -> i.getStatus() == ImageStatus.UPLOADING)) {
            next = BatchStatus.UPLOADING;
        } else if (relevant.stream().anyMatch(i -> i.getStatus() == ImageStatus.PROCESSING)) {
            next = BatchStatus.PROCESSING;
        } else if (relevant.stream().allMatch(i -> i.getStatus() == ImageStatus.FAILED)) {
            // Toàn bộ ảnh active đều FAILED — chưa từng có ảnh hợp lệ nào trong batch.
            next = BatchStatus.FAILED;
        } else if (relevant.stream().anyMatch(i -> i.getStatus() == ImageStatus.FAILED)) {
            // Có ảnh FAILED nhưng còn ảnh khác ACTIVE/PENDING_MOVE/MOVED hợp lệ — mergeable, không
            // cần "Thử lại/Hủy phiên" (Spec 1 mục 1).
            next = BatchStatus.PARTIAL_FAILED;
        } else if (!conflictService.openBlocking(batchId).isEmpty()) {
            next = BatchStatus.NEED_REVIEW;
        } else {
            next = BatchStatus.READY_TO_APPROVE;
        }

        batch.setStatus(next);
        return scanBatchRepository.save(batch).getStatus();
    }
}
