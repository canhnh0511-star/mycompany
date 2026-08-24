package com.mycompany.api.entity;

/**
 * Vòng đời 1 ScanBatch (0021-scan-batch-model, Spec 1 mục 1). Tách riêng khỏi RecordStatus — mô tả
 * pipeline xử lý ảnh (upload→OCR→review→approve), không phải vòng đời 1 dòng dữ liệu.
 *
 * ACTIVE/MERGEABLE — "batch còn sống", chặn tạo PRIMARY mới, ảnh mới tự merge vào:
 *   DRAFT, UPLOADING, PROCESSING, NEED_REVIEW, READY_TO_APPROVE, PARTIAL_FAILED
 * RECOVERABLE BUT NOT AUTO-MERGE — vẫn chặn tạo batch mới, nhưng không tự nhận ảnh mới:
 *   FAILED
 * TERMINAL — không nhận thêm merge/upload:
 *   APPROVED, CANCELLED
 */
public enum BatchStatus {
    DRAFT,
    UPLOADING,
    PROCESSING,
    NEED_REVIEW,
    READY_TO_APPROVE,
    PARTIAL_FAILED,
    FAILED,
    APPROVED,
    CANCELLED;

    private static final java.util.Set<BatchStatus> MERGEABLE = java.util.EnumSet.of(
            DRAFT, UPLOADING, PROCESSING, NEED_REVIEW, READY_TO_APPROVE, PARTIAL_FAILED);

    // Spec 1 mục 3.2 — status còn được coi là "Supplement đang active" (KHÁC MERGEABLE: có thêm
    // FAILED — 1 Supplement FAILED vẫn chặn tạo Supplement thứ 2, user phải Thử lại/Hủy trước).
    // Nguồn sự thật DUY NHẤT cho set này — ScanBatchCreationService/ProductionSummaryService dùng
    // chung qua method này, không tự khai list riêng (tránh lệch nhau khi sửa 1 chỗ quên chỗ kia).
    private static final java.util.Set<BatchStatus> ACTIVE_SUPPLEMENT = java.util.EnumSet.of(
            DRAFT, UPLOADING, PROCESSING, NEED_REVIEW, READY_TO_APPROVE, PARTIAL_FAILED, FAILED);

    /** ACTIVE/MERGEABLE theo Spec 1 mục 1 — batch còn sống, nhận merge ảnh mới. */
    public boolean isMergeable() {
        return MERGEABLE.contains(this);
    }

    public boolean isTerminal() {
        return this == APPROVED || this == CANCELLED;
    }

    /** Supplement ở status này được coi là "đang active" — tối đa 1 cái/PRIMARY (Spec 1 mục 3.2). */
    public boolean isActiveSupplement() {
        return ACTIVE_SUPPLEMENT.contains(this);
    }
}
