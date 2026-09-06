package com.mycompany.api.dto;

import java.util.UUID;

/**
 * Detail của conflict {@code EMPTY_ROW_SKIPPED} — 1 dòng CÓ tên trên phiếu nhưng KHÔNG có số liệu
 * (nghỉ/không cạo, HOẶC đã gộp chung sản lượng vào dòng vợ/chồng — xem
 * ScanBatchService.captureProductionRecordRows). Trước đây chỉ lưu {@code employeeNameRaw}, không
 * đủ để frontend biết CHÍNH XÁC nhân viên nào (phải tự fuzzy-match lại, không đáng tin) — thêm
 * {@code employeeId} (null nếu không fuzzy-match được ai) để frontend đọc thẳng, dùng cho việc sắp
 * bảng roster đúng thứ tự ảnh gốc (phản hồi trực tiếp: "API không trả ra index cho các dòng trống").
 *
 * {@code explainedBySpouse}: true khi dòng trống này là do gộp chung vợ/chồng (không phải nghỉ thật)
 * — frontend dùng để đổi nhãn hiển thị ("tính chung với vợ/chồng" thay vì "nghỉ/không cạo").
 */
public record OcrEmptyRow(String employeeNameRaw, UUID employeeId, Integer rowIndex, boolean explainedBySpouse) {
}
