package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /api/v1/production-summary/monthly (Spec 2 §35, SHOULD). Chỉ tổng theo loại mủ toàn kỳ —
 * KHÔNG breakdown theo Tổ trong response này (khớp ví dụ Spec 2 §35: "Theo loại mủ" phẳng, không
 * lồng theo Tổ; lọc theo 1 Tổ cụ thể dùng tham số {@code teamId}).
 */
public record MonthlyProductionResponse(
        String yearMonth, BigDecimal totalKg, List<LatexTypeKg> byLatexType) {
}
