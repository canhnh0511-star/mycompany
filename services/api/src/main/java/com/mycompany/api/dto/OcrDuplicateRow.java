package com.mycompany.api.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * 1 dòng OCR đọc được nhưng KHÔNG tạo được production_record vì nhân viên/ngày đó đã có bản ghi
 * ACTIVE khác (thường do ảnh thứ 2 trở đi trong cùng batch/ngày — "trang bổ sung" hoặc trùng ảnh
 * chưa được xử lý). Lưu nguyên số liệu dòng này vào `conflict.detail` (cùng pattern
 * `OcrUnmatchedLine`) để có thể GHI ĐÈ lên bản ghi cũ sau này (action=OVERRIDE) thay vì chỉ biết tên
 * nhân viên suông — phát hiện qua test thật: trước đây conflict chỉ lưu employeeName, không có cách
 * nào áp dụng lại số liệu ảnh mới nếu Admin xác nhận muốn dùng số liệu đó.
 */
public record OcrDuplicateRow(
        UUID employeeId,
        String employeeName,
        LocalDate recordDate,
        List<LatexItemRequest> items,
        String notes,
        List<String> lowConfidenceFields,
        Integer rowIndex) {
}
