package com.mycompany.api.dto;

/**
 * {@code cost}/{@code estimatedProfit} LUÔN null — Module 1 chưa có bảng chi phí, không tính/không
 * bịa trend cho 2 field này (CLAUDE.md mục 1 "Ngoài phạm vi Module 1"). {@code production}/
 * {@code workforce}/{@code sold} tính thật từ dữ liệu ngày hiện tại so với ngày trước đó.
 */
public record DashboardTrendsResponse(
        TrendResponse production,
        TrendResponse workforce,
        TrendResponse sold,
        TrendResponse cost,
        TrendResponse estimatedProfit) {
}
