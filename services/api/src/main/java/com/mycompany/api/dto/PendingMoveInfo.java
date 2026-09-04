package com.mycompany.api.dto;

import java.time.LocalDate;

/**
 * Spec 2 §25 — ảnh đang PENDING_MOVE ở PRIMARY batch của Tổ/ngày này: KHÔNG tính vào Official
 * Production của cả ngày nguồn lẫn ngày đích cho tới khi Supplement đích được APPROVED (Spec 1 mục
 * 5/5.1). {@code imageCount} > 1 nếu nhiều ảnh cùng chuyển tới CÙNG 1 targetWorkDate; nếu nhiều
 * target khác ngày, mỗi ngày đích là 1 phần tử riêng trong danh sách (xem
 * TeamProductionSummary.pendingMoveInfo — List, không phải object đơn).
 */
public record PendingMoveInfo(LocalDate targetWorkDate, int imageCount) {
}
