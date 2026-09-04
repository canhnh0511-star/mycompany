package com.mycompany.api.dto;

/**
 * GET /api/v1/dashboard/work-queue — khớp {@code WorkQueueItemData} phía FE. {@code id} là chuỗi ổn
 * định (KHÔNG dùng UUID random mỗi lần gọi) — frontend dùng làm React key, phải giữ nguyên giữa các
 * lần gọi cùng ngày để không remount/mất animation.
 */
public record WorkQueueItemResponse(
        String id,
        String severity, // warning | error | info
        String title,
        String description,
        String actionLabel,
        String actionHref) {
}
