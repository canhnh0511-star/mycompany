package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** clientImageId echo lại nguyên văn từ {@link CaptureImageRequest} — frontend dùng để khớp ảnh vừa
 * upload trong hàng đợi cục bộ với đúng dòng trả về trong {@code images[]} (id server sinh ra thì
 * client không biết trước). */
public record ScanImageResponse(
        UUID id,
        String clientImageId,
        String photoUrl,
        String status,
        String dateVerificationStatus,
        String dateResolution,
        LocalDate ocrDetectedDate,
        LocalDate effectiveWorkDate,
        UUID pendingMoveTargetBatchId,
        String errorMessage,
        Instant createdAt,
        // Số dòng OCR đọc được từ ảnh này (null nếu chưa xử lý xong OCR, hoặc LATEX_SALE không có
        // khái niệm "rows") — Admin đối chiếu bằng mắt với số dòng thật trên phiếu giấy.
        Integer ocrRowCount,
        // "Tổng cộng" OCR đọc được trên phiếu theo từng loại mủ — JSON string nguyên văn dạng
        // column_totals của tool schema (null nếu phiếu không có dòng tổng, hoặc chưa xử lý xong OCR).
        // Frontend tự parse, giống cách lowConfidenceFields đang làm (migration 016).
        String ocrColumnTotals) {
}
