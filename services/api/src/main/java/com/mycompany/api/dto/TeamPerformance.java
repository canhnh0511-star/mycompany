package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 1 dòng trong bảng "Hiệu suất theo Tổ" (spec §8). `status` derive từ độ đầy đủ dữ liệu + biến động
 * so với kỳ trước (spec §8.2 — KHÔNG dựa ngưỡng sản lượng tuyệt đối): xem ProductionDashboardService.
 */
public record TeamPerformance(
        UUID teamId,
        String teamName,
        BigDecimal productionKg,
        int workerCount,
        BigDecimal averagePerWorkerKg,
        BigDecimal changePercent,
        String status) {
}
