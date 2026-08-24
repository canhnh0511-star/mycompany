package com.mycompany.api.dto;

import java.util.List;

/**
 * 1 dòng công nhân trong ảnh sổ ghi mủ mà fuzzy-match KHÔNG tìm ra employee khớp — trả nguyên dữ
 * liệu OCR đọc được để frontend cho Admin chọn thủ công (CLAUDE.md §9: luôn cho phép chọn thủ công
 * khi không khớp chính xác). Admin xử lý dòng này qua form "Nhập tay nhanh" / batch endpoint sẵn
 * có ở Phase 2, không phải endpoint riêng.
 */
public record OcrUnmatchedLine(
        String employeeNameRaw,
        List<LatexItemRequest> items,
        String notes,
        List<String> lowConfidenceFields,
        // Thứ tự dòng gốc trên phiếu giấy (Vấn đề 3, migration 013) — mang theo tới lúc Admin
        // ASSIGN_EMPLOYEE để record tạo ra vẫn xếp đúng vị trí trong bảng.
        Integer rowIndex) {
}
