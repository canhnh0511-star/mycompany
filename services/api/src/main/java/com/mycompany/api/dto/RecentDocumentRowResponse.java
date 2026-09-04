package com.mycompany.api.dto;

import java.time.LocalDate;

/**
 * GET /api/v1/dashboard/recent-documents — khớp {@code RecentDocumentRow} phía FE. {@code code} tự
 * sinh (DB không có cột mã phiếu) dạng {@code PH-{yyyyMMdd}-{seq}}, seq đánh theo created_at ASC
 * TRONG NGÀY recordDate, gộp chung cả production_record lẫn latex_sale (xem DashboardService).
 * {@code status} là DocumentStatus đã map cho FE — KHÔNG phải RecordStatus thô của DB (khác quy ước
 * {@code String status} = enum.name() ở ProductionRecordResponse/AttendanceRecordResponse).
 */
public record RecentDocumentRowResponse(
        String id,
        String code,
        String documentType, // production | latex_sale
        LocalDate recordDate,
        String teamName,
        String status // draft | need_review | approved (cancelled bị lọc bỏ khỏi danh sách này)
) {
}
