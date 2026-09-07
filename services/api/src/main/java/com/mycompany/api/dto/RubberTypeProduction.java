package com.mycompany.api.dto;

import java.math.BigDecimal;

/** Cơ cấu sản lượng theo loại mủ (spec §7 — donut). `code` đọc động từ latex_types (danh mục MỞ). */
public record RubberTypeProduction(String code, String label, BigDecimal productionKg, BigDecimal percentage) {
}
