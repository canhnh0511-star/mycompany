package com.mycompany.api.dto;

/**
 * So sánh 1 chỉ số hôm nay vs hôm qua, dùng ở {@link DashboardKpisResponse#trends()} — khớp `Trend`
 * phía FE (apps/web/src/features/dashboard/model/dashboard.types.ts). Backend format sẵn {@code value}
 * (vd "12%") và quyết định {@code semantic} — frontend chỉ render, không tự suy luận tăng/giảm là tốt/xấu.
 */
public record TrendResponse(
        String direction, // up | down | neutral
        String value, // đã format sẵn, vd "12%"
        String label, // cố định "so với hôm qua"
        String semantic // positive | negative | neutral
) {
}
