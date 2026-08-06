package com.mycompany.api.dto;

import java.util.List;

/**
 * Kết quả nhập liệu batch — best-effort theo từng dòng (docs/adr/0007-batch-manual-entry-best-effort.md):
 * 1 dòng lỗi không rollback các dòng khác đã lưu thành công trong cùng request. Frontend dựa vào
 * {@code index} để highlight đúng dòng lỗi.
 */
public record BatchResult<T>(List<BatchItemResult<T>> results) {

    public record BatchItemResult<T>(int index, boolean success, T data, String error) {

        public static <T> BatchItemResult<T> ok(int index, T data) {
            return new BatchItemResult<>(index, true, data, null);
        }

        public static <T> BatchItemResult<T> failed(int index, String error) {
            return new BatchItemResult<>(index, false, null, error);
        }
    }
}
