package com.mycompany.api.entity;

/**
 * Vòng đời 1 ScanImage (0021-scan-batch-model, Spec 1 mục 1/5). PENDING_MOVE/MOVED phục vụ luồng
 * resolve date-mismatch khi target batch đã APPROVED (RULE 9/15) — record dưới ảnh này KHÔNG đổi
 * RecordStatus, chỉ ảnh đổi ImageStatus (xem Spec 1 mục 5.1, quyết định kiến trúc #4 trong plan).
 */
public enum ImageStatus {
    UPLOADING,
    PROCESSING,
    ACTIVE,
    FAILED,
    PENDING_MOVE,
    MOVED,
    REPLACED
}
