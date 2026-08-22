package com.mycompany.api.entity;

/**
 * Tách riêng khỏi {@link RecordStatus} (0021-scan-batch-model) — trước đó attendance_records dùng
 * chung enum với production_records/latex_sales dù không liên quan. Giá trị/DB mapping giữ nguyên y
 * hệt (draft/confirmed/cancelled) — đây thuần là refactor Java, không đổi dữ liệu.
 */
public enum AttendanceRecordStatus {
    DRAFT,
    CONFIRMED,
    CANCELLED
}
