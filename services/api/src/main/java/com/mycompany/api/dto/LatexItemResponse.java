package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LatexItemResponse(
        UUID latexTypeId,
        String latexTypeCode,
        BigDecimal kg,
        BigDecimal drcPercent) {
}
