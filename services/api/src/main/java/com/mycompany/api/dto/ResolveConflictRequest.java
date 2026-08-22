package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Generic resolver cho các ConflictType còn lại (UNKNOWN_EMPLOYEE/INVALID_BUSINESS_VALUE/
 * POTENTIAL_DUPLICATE_OCR_ROW/DUPLICATE_IMAGE) — Spec 1 mục 6.
 * action:
 *   OVERRIDE — user xác nhận bỏ qua, giữ nguyên dữ liệu (conflict -> OVERRIDDEN).
 *   DISCARD  — bỏ dòng/ảnh này (nếu đã có record, cancel record đó; conflict -> RESOLVED).
 *   ASSIGN_EMPLOYEE — CHỈ cho UNKNOWN_EMPLOYEE (bắt buộc employeeId): tạo record thật từ dữ liệu
 *     OCR đã lưu trong detail JSON của conflict.
 */
public record ResolveConflictRequest(@NotNull String action, UUID employeeId) {
}
