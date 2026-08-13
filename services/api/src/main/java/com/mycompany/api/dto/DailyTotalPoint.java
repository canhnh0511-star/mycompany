package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 1 điểm dữ liệu trong {@link ProductionDailyTrendResponse} — 1 ngày, có thể totalKg = 0. */
public record DailyTotalPoint(LocalDate recordDate, BigDecimal totalKg) {
}
