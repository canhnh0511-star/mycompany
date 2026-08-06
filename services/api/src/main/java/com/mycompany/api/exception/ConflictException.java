package com.mycompany.api.exception;

/**
 * Xung đột nghiệp vụ — vd chồng lấn khoảng effective_from/to của rate_configs/allowance_configs
 * (bắt ở service layer trước khi DB tự chặn bằng EXCLUDE constraint, để trả lỗi rõ ràng hơn thay vì lộ
 * constraint name thô), hoặc xóa 1 danh mục đang bị tham chiếu (vd latex_types còn gắn với
 * rate_configs/production_record_items/latex_sale_items). Map sang HTTP 409 ở GlobalExceptionHandler.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
