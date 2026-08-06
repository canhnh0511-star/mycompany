package com.mycompany.api.dto;

import com.mycompany.api.entity.OcrTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * targetType — loại phiếu Admin ĐÃ CHỌN trước khi chụp/chọn ảnh (CLAUDE.md §5), không phải loại
 * đọc được từ ảnh. photoPath — lấy từ SignedUploadUrlResponse sau khi client đã upload xong.
 * teamId — BẮT BUỘC khi targetType=LATEX_SALE (latex_sales.team_id NOT NULL); khi
 * targetType=PRODUCTION_RECORD chỉ là gợi ý thu hẹp phạm vi fuzzy-match theo Tổ đang làm việc
 * trong phiên (CLAUDE.md §5 mobile UX) — có thể để trống để match trên toàn bộ nhân viên active.
 */
public record OcrCaptureRequest(
        @NotNull OcrTargetType targetType,
        @NotBlank String photoPath,
        UUID teamId) {
}
