package com.mycompany.api.dto;

import com.mycompany.api.entity.CalcType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * code KHÔNG unique một mình — nhiều dòng theo thời gian cho cùng 1 code là hợp lệ (CLAUDE.md §4),
 * chống chồng lấn theo (code, effective_from/to) giống RateConfig.
 */
public record CreateAllowanceConfigRequest(
        @NotBlank @Size(max = 30) String code,
        @NotBlank @Size(max = 100) String name,
        @NotNull CalcType calcType,
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
