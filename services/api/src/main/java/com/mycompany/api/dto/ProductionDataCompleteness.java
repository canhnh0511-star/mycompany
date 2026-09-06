package com.mycompany.api.dto;

/**
 * Widget "Mức độ hoàn chỉnh dữ liệu" (spec §11). Lưu ý spec §11.2: `confirmedDays`/`pendingDays`/
 * `noDataDays` là trạng thái NGÀY (cộng lại = totalDaysInRange); `documentsNeedingReview` là trạng
 * thái PHIẾU (conflict OCR blocking còn mở) — 2 nhóm số này KHÔNG cộng dồn chung với nhau.
 */
public record ProductionDataCompleteness(
        int totalDaysInRange,
        int confirmedDays,
        int pendingDays,
        int noDataDays,
        int completionPercent,
        int documentsNeedingReview) {
}
