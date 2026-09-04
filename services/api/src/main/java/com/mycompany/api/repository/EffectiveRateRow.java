package com.mycompany.api.repository;

import java.math.BigDecimal;

/**
 * Projection thô cho {@link RateConfigRepository#findEffectiveRatesAt} — 1 dòng / loại mủ đang hiệu
 * lực tại 1 ngày cụ thể. Dashboard (Home) dùng để tính soldRevenue từ soldKg theo từng loại mủ
 * (CLAUDE.md §4 rate_configs — thống nhất toàn công ty, time-versioned).
 */
public record EffectiveRateRow(String latexTypeCode, BigDecimal unitPrice) {
}
