package com.mycompany.api.entity;

/**
 * Dùng chung cho ProductionRecord.status và LatexSale.status (KHÔNG dùng cho AttendanceRecord —
 * xem AttendanceRecordStatus, tách riêng ở 0021-scan-batch-model).
 * APPROVED (trước đây CONFIRMED, đổi tên ở 0021-scan-batch-model để nhất quán thuật ngữ với
 * ScanBatch.status APPROVED — cùng nghĩa "đã khóa, immutable", tránh 2 từ khác nhau cho cùng 1 khái
 * niệm). Xem migration 006_rename_confirmed_to_approved.sql.
 */
public enum RecordStatus {
    DRAFT,
    APPROVED,
    CANCELLED
}
