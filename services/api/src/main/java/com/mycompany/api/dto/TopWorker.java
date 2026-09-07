package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * 1 dòng trong bảng "Top công nhân theo sản lượng" (spec §9).
 *
 * <p>{@code kgByLatexType}: kg theo từng loại mủ (key = {@code latex_type_code}, cùng khớp
 * {@code ProductionDashboardResponse.latexTypeCodes/latexTypeLabels} — frontend tự map code sang
 * nhãn hiển thị, giống hệt {@code ProductionHeatmapCell.kgByLatexType}) — dùng cho popup "Xem thêm"
 * (top 10, đủ cột từng loại mủ + cột Tổng), panel rút gọn (top 4) chỉ cần {@code productionKg}.
 */
public record TopWorker(
        UUID employeeId,
        String employeeName,
        UUID teamId,
        String teamName,
        BigDecimal productionKg,
        Map<String, BigDecimal> kgByLatexType) {
}
