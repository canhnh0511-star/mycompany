package com.mycompany.api.dto;

import com.mycompany.api.entity.OcrTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Thay thế OcrCaptureRequest (0021-scan-batch-model) — 1 request = 1 ảnh vào 1 ScanBatch.
 * workDate = sessionWorkDate (RULE 1, nguồn ngày làm việc chính — KHÔNG suy từ OCR). teamId BẮT
 * BUỘC cho cả 2 documentType (khác OcrCaptureRequest cũ — PRODUCTION_RECORD trước đây chỉ là gợi ý
 * optional) vì teamId là 1 phần của LogicalBatchKey. clientImageId sinh client-side, dùng dedup
 * retry-upload (RULE 4) — gọi lại cùng clientImageId trả về trạng thái ảnh hiện có, không xử lý lại.
 */
public record CaptureImageRequest(
        @NotNull OcrTargetType documentType,
        @NotNull LocalDate workDate,
        @NotNull UUID teamId,
        @NotBlank String photoPath,
        @NotBlank String clientImageId) {
}
