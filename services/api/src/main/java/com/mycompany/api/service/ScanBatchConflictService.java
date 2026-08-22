package com.mycompany.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.entity.ConflictStatus;
import com.mycompany.api.entity.ConflictType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanBatchConflict;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.ScanBatchConflictRepository;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Ledger blocking conflict (Spec 1 mục 6) — nguồn duy nhất tính canApprove, và thứ tự hiển thị UI
 * (displayOrder, tính tĩnh ở đây, KHÔNG lưu DB — khác với điều kiện blocking, xem class javadoc
 * ScanBatchConflict).
 */
@Service
@RequiredArgsConstructor
public class ScanBatchConflictService {

    // Thứ tự hiển thị cảnh báo cho user xử lý (Spec 1 mục 6 "thứ tự xử lý cảnh báo") — tách biệt
    // với điều kiện blocking approve.
    private static final Map<ConflictType, Integer> DISPLAY_ORDER = new EnumMap<>(ConflictType.class);
    static {
        DISPLAY_ORDER.put(ConflictType.DUPLICATE_IMAGE, 1);
        DISPLAY_ORDER.put(ConflictType.IMAGE_QUALITY_OR_OCR_FAILED, 2);
        DISPLAY_ORDER.put(ConflictType.DATE_MISMATCH, 3);
        DISPLAY_ORDER.put(ConflictType.PENDING_MOVE, 4);
        DISPLAY_ORDER.put(ConflictType.UNKNOWN_EMPLOYEE, 5);
        DISPLAY_ORDER.put(ConflictType.INVALID_BUSINESS_VALUE, 6);
        DISPLAY_ORDER.put(ConflictType.POTENTIAL_DUPLICATE_OCR_ROW, 7);
        DISPLAY_ORDER.put(ConflictType.OTHER, 8);
    }

    private final ScanBatchConflictRepository conflictRepository;
    private final ObjectMapper objectMapper;

    public int displayOrder(ConflictType type) {
        return DISPLAY_ORDER.getOrDefault(type, 99);
    }

    public ScanBatchConflict open(ScanBatch batch, ScanImage image, String recordTable, UUID recordId,
            ConflictType type, boolean blocking, Object detail) {
        return conflictRepository.save(ScanBatchConflict.builder()
                .scanBatch(batch)
                .scanImage(image)
                .recordTable(recordTable)
                .recordId(recordId)
                .conflictType(type)
                .blocking(blocking)
                .status(ConflictStatus.OPEN)
                .detail(writeJsonOrNull(detail))
                .build());
    }

    public void resolve(ScanBatchConflict conflict, ConflictStatus finalStatus, String resolution, User resolvedBy) {
        conflict.setStatus(finalStatus);
        conflict.setResolution(resolution);
        conflict.setResolvedBy(resolvedBy);
        conflict.setResolvedAt(Instant.now());
        conflictRepository.save(conflict);
    }

    public boolean canApprove(UUID batchId) {
        return conflictRepository.findByScanBatchIdAndBlockingAndStatus(batchId, true, ConflictStatus.OPEN).isEmpty();
    }

    public List<ScanBatchConflict> openBlocking(UUID batchId) {
        return conflictRepository.findByScanBatchIdAndBlockingAndStatus(batchId, true, ConflictStatus.OPEN);
    }

    public List<ScanBatchConflict> forBatch(UUID batchId) {
        return conflictRepository.findByScanBatchIdOrderByCreatedAtAsc(batchId);
    }

    public List<ScanBatchConflict> openForImage(UUID imageId) {
        return conflictRepository.findByScanImageIdAndStatus(imageId, ConflictStatus.OPEN);
    }

    public ScanBatchConflict getOrThrow(UUID conflictId) {
        return conflictRepository.findById(conflictId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy conflict với id=" + conflictId));
    }

    private String writeJsonOrNull(Object detail) {
        if (detail == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Không serialize được conflict detail", e);
        }
    }
}
