package com.mycompany.api.repository;

import java.math.BigDecimal;

/**
 * Projection thô cho {@link ProductionRecordItemRepository#sumKgByScanImage} — tổng kg thực tế đã tạo
 * (record + item) theo TỪNG loại mủ cho 1 ảnh, dùng đối chiếu với `column_totals` OCR đọc từ dòng
 * "Tổng cộng" trên phiếu giấy (phát hiện đọc nhầm cột — vd Mủ dây bị ghi nhầm thành Mủ đông, xem
 * ConflictType.TOTAL_MISMATCH, phát hiện khi test thật 2026-08-23).
 */
public record ImageLatexTotalRow(String latexTypeCode, BigDecimal totalKg) {
}
