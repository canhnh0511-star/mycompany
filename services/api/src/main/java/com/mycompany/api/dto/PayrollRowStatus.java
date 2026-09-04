package com.mycompany.api.dto;

/**
 * Trạng thái dòng nhân viên ở Bảng lương — DERIVED, không lưu DB (docs/specs/spec-3-bang-luong-v1-draft.md
 * mục 2.5): dựa vào status của production_records trong tháng.
 *   MISSING_DATA  — không có production_records nào (status &lt;&gt; cancelled) trong tháng.
 *   NEEDS_REVIEW  — có ít nhất 1 production_records đang DRAFT trong tháng.
 *   CONFIRMED     — có record, và tất cả đều APPROVED.
 */
public enum PayrollRowStatus {
    MISSING_DATA,
    NEEDS_REVIEW,
    CONFIRMED
}
