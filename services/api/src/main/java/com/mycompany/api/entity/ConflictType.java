package com.mycompany.api.entity;

/** Loại blocking conflict trong 1 ScanBatch (Spec 1 mục 6). */
public enum ConflictType {
    DUPLICATE_IMAGE,
    IMAGE_QUALITY_OR_OCR_FAILED,
    DATE_MISMATCH,
    UNKNOWN_EMPLOYEE,
    INVALID_BUSINESS_VALUE,
    POTENTIAL_DUPLICATE_OCR_ROW,
    PENDING_MOVE,
    OTHER,
    // Tổng kg thực tế đã tạo record (theo loại mủ) lệch với dòng "Tổng cộng" OCR đọc được trên phiếu
    // giấy — dấu hiệu OCR đọc nhầm CỘT (vd Mủ dây bị ghi thành Mủ đông) dù bản thân giá trị "trông"
    // hợp lý, không bị flag low_confidence (phát hiện khi test thật 2026-08-23, xem ADR-0021 addendum).
    TOTAL_MISMATCH,
    // Non-blocking — dòng tên có trên phiếu nhưng không ghi số liệu (thường là không cạo mủ hôm đó).
    // Trước đây chỉ ghi audit log (không hiện trên UI review) khiến Admin đếm thấy thiếu dòng so với
    // số nhân viên trên phiếu, tưởng nhầm OCR đọc thiếu — hiện ra đây để rõ ràng đây là chủ ý, không
    // phải lỗi đọc thiếu (CLAUDE.md §5, phát hiện khi test thật 2026-08-23).
    EMPTY_ROW_SKIPPED
}
