package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.UUID;

/** 1 dòng khối lượng theo loại mủ, dùng chung cho ProductionRecord/LatexSale items. */
public record LatexItemRequest(
        @NotNull UUID latexTypeId,
        @NotNull @PositiveOrZero BigDecimal kg,
        // CHỈ có ý nghĩa khi latexType.code = "water" (DRC chỉ đo cho mủ nước, CLAUDE.md §4) —
        // không validate cứng ở đây (danh mục latex_types MỞ, ADR-0002); service layer không chặn nếu
        // Admin lỡ điền, chỉ đơn giản lưu vào cột chỉ có ý nghĩa với mủ nước.
        BigDecimal drcPercent) {
}
