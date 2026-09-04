package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProductionRecordResponse(
        UUID id,
        LocalDate recordDate,
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        String notes,
        String source,
        String photoUrl,
        UUID ocrCallLogId,
        String lowConfidenceFields,
        UUID createdBy,
        Instant createdAt,
        String status,
        List<LatexItemResponse> items,
        // null cho record nhập tay (source=manual) — chỉ có khi tạo qua luồng OCR (0021-scan-batch-model).
        UUID scanImageId,
        // Thứ tự dòng gốc trên phiếu giấy — null cho record nhập tay hoặc tạo trước migration 013.
        // Frontend sort theo field này để hiện đúng thứ tự như ảnh gốc (Batch Review + tra cứu cũ).
        Integer rowIndex,
        // Batch chứa record này — dùng để phân biệt originContext (PRIMARY/SUPPLEMENT, Spec 2 §23) khi
        // drill-down từ Sản lượng v2 (Phase 4). Null cho record nhập tay/dữ liệu trước migration 008,
        // cùng ý nghĩa null như scanImageId (audit Phase 4, xem docs/plans/0021...).
        UUID scanBatchId) {
}
