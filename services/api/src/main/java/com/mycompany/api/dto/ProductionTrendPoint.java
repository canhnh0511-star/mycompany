package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 1 điểm trong widget "Xu hướng sản lượng theo ngày" (spec §6). `currentKg`/`previousPeriodKg` = null
 * khi NGÀY ĐÓ không có bản ghi APPROVED nào — khác `0` (spec §25 "0 khác null; missing data không
 * bị tính là zero"). `previousDate` = ngày tương ứng ở kỳ trước (cùng offset trong kỳ) để tooltip
 * hiển thị đúng ngày đang so sánh.
 */
public record ProductionTrendPoint(
        LocalDate date, BigDecimal currentKg, LocalDate previousDate, BigDecimal previousPeriodKg) {
}
