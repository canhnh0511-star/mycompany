package com.mycompany.api.dto;

import java.math.BigDecimal;

/** 1 dòng breakdown "số lượng × đơn giá = thành tiền" ở panel chi tiết Bảng lương (drill-down —
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 4, cùng nguyên tắc trace-được như Spec 2 mục 22-24). */
public record PayrollLineItem(String label, BigDecimal quantity, String unit, BigDecimal unitPrice, BigDecimal amount) {
}
