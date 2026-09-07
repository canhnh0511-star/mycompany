package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * 1 ô trong Heatmap "Sản lượng theo ngày / theo Tổ" (spec §12). `productionKg`/`workerCount` = null
 * khi KHÔNG có bản ghi APPROVED nào cho (Tổ, ngày) này ("no-data" — spec §12.7), khác `0` (có dữ liệu
 * nhưng thực sự bằng 0, về lý thuyết không xảy ra vì kg > 0 luôn, nhưng giữ đúng ngữ nghĩa null-vs-zero
 * chung của toàn dashboard). `documentCount` luôn là số thật (0 hợp lệ — đếm phiếu, không phải sản
 * lượng) — đếm CẢ draft (không tính cancelled), khác `productionKg` chỉ tính approved.
 */
public record ProductionHeatmapCell(
        LocalDate date,
        UUID teamId,
        String teamName,
        BigDecimal productionKg,
        Integer workerCount,
        int documentCount,
        Map<String, BigDecimal> kgByLatexType) {
}
