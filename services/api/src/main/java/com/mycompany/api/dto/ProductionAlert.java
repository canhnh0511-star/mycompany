package com.mycompany.api.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * 1 cảnh báo trong "Cảnh báo / Điểm cần chú ý" (spec §10). `severity`: RED (blocking/critical) |
 * AMBER (needs attention) | BLUE (informational) — spec §10.2. `linkType` nói cho frontend biết
 * click vào alert này nên mở gì (spec §10.3 "mở đúng entity, không chỉ link về trang chung"):
 * TEAM (set filter Tổ), DATE (mở ProductionDayDrawer), SCAN_BATCH (mở review batch OCR).
 */
public record ProductionAlert(
        String id,
        String severity,
        String category,
        String title,
        String description,
        String linkType,
        UUID linkTeamId,
        LocalDate linkDate,
        UUID linkScanBatchId) {
}
