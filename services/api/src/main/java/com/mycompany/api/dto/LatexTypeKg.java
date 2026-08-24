package com.mycompany.api.dto;

import java.math.BigDecimal;

/** 1 dòng breakdown theo loại mủ (Spec 2 §9/§13) — dùng cho cả summary tổng và breakdown theo Tổ. */
public record LatexTypeKg(String code, String label, BigDecimal kg) {
}
