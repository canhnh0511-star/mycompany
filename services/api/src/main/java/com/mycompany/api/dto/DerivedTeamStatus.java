package com.mycompany.api.dto;

/**
 * Case A-G, Spec 2 §6 (Sản lượng v2) — trạng thái tổng hợp của 1 Tổ/ngày, tính RUNTIME từ
 * {@code BatchStatus} của PRIMARY + có/không Supplement active, KHÔNG lưu DB (không phải entity
 * state, chỉ là projection cho response — xem ProductionSummaryService.deriveTeamStatus).
 */
public enum DerivedTeamStatus {
    /** Case A — không có PRIMARY (chưa từng chụp, hoặc PRIMARY duy nhất đã CANCELLED). */
    NO_DATA,
    /** Case B — PRIMARY đang DRAFT/UPLOADING/PROCESSING. */
    PROCESSING,
    /** Case C — PRIMARY đang NEED_REVIEW/PARTIAL_FAILED. */
    NEEDS_REVIEW,
    /** Case D — PRIMARY đã READY_TO_APPROVE, chờ Admin xác nhận. */
    READY_TO_APPROVE,
    /** Case E — PRIMARY APPROVED, không có Supplement active. */
    APPROVED,
    /** Case F — PRIMARY APPROVED + có Supplement đang active (chưa cộng vào Official Production). */
    APPROVED_WITH_ACTIVE_SUPPLEMENT,
    /** Case G — PRIMARY FAILED. */
    FAILED
}
