package com.mycompany.api.dto;

import com.mycompany.api.dto.BatchResult.BatchItemResult;
import java.util.List;
import java.util.UUID;

/**
 * success — cuộc gọi Claude API có lỗi kỹ thuật không (khác type_mismatch). typeMismatch — chỉ có
 * ý nghĩa khi success=true; true nghĩa là KHÔNG tạo draft nào, ảnh bị loại (CLAUDE.md §5).
 * productionRecords/latexSales — best-effort per-row như batch Phase 2 (ADR-0007), field còn lại
 * null theo targetType. unmatchedLines — chỉ áp dụng PRODUCTION_RECORD, dòng OCR không fuzzy-match
 * ra nhân viên nào.
 */
public record OcrCaptureResponse(
        UUID ocrCallLogId,
        boolean success,
        String errorMessage,
        boolean typeMismatch,
        String mismatchReason,
        List<BatchItemResult<ProductionRecordResponse>> productionRecords,
        List<BatchItemResult<LatexSaleResponse>> latexSales,
        List<OcrUnmatchedLine> unmatchedLines) {
}
