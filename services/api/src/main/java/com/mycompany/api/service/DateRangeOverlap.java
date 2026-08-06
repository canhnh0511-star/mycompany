package com.mycompany.api.service;

import java.time.LocalDate;

/**
 * Dùng chung cho RateConfigService/AllowanceConfigService — cùng mô hình time-versioned +
 * EXCLUDE constraint chống chồng lấn effective_from/to (CLAUDE.md §4). Bán-mở [from, to) giống
 * Postgres daterange(); effectiveTo = null nghĩa là vô cực (đang hiệu lực).
 */
final class DateRangeOverlap {

    private DateRangeOverlap() {
    }

    static boolean overlaps(LocalDate from1, LocalDate to1, LocalDate from2, LocalDate to2) {
        LocalDate end1 = to1 == null ? LocalDate.MAX : to1;
        LocalDate end2 = to2 == null ? LocalDate.MAX : to2;
        return from1.isBefore(end2) && from2.isBefore(end1);
    }
}
