package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** 1 dòng / Tổ có phát sinh bán mủ trong kỳ. kgByLatexType key = latex_type code. */
public record LatexSaleReportRow(UUID teamId, String teamName, Map<String, BigDecimal> kgByLatexType, BigDecimal totalKg) {
}
