package com.mycompany.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Sản lượng theo từng ngày trong 1 khoảng ngày (docs/module-1-1-frontend-redesign-progress.md — Home
 * "Sản lượng 7 ngày" biểu đồ cột + trend "↑X% so với TB 7 ngày"). `days` LUÔN đủ 1 điểm / ngày liên tục
 * từ fromDate đến toDate (kể cả ngày không có dữ liệu → totalKg = 0) — frontend vẽ biểu đồ/tính trung
 * bình không cần tự điền khoảng trống.
 */
public record ProductionDailyTrendResponse(LocalDate fromDate, LocalDate toDate, List<DailyTotalPoint> days) {
}
