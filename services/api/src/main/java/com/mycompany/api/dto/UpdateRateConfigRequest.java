package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/** latexTypeId KHÔNG sửa được qua đây — đổi loại mủ của 1 dòng đơn giá lịch sử không có ý nghĩa. */
public record UpdateRateConfigRequest(
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
