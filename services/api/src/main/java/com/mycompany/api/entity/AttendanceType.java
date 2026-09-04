package com.mycompany.api.entity;

/** "lighting" (tiền đèn) cố ý KHÔNG có ở đây — là phụ cấp cố định/tháng, không gắn chấm công theo ngày.
 * SEASONAL_WORK ("Công thời vụ", Module 3 — Bảng lương, 2026-09-04) — allowance_configs code mới,
 * CHƯA có dòng giá tương ứng (đơn giá/ngày hiệu lực còn là câu hỏi mở, xem
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 8) — chỉ mở domain sẵn sàng nhận giá trị này. */
public enum AttendanceType {
    TAPPING_WORK,
    ATTENDANCE,
    STORM_ALLOWANCE,
    MEDICATION,
    SEASONAL_WORK
}
