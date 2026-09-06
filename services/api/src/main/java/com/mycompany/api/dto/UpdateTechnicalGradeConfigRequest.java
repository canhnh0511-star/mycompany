package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

/** grade KHÔNG sửa được qua đây — xem CreateTechnicalGradeConfigRequest. */
public record UpdateTechnicalGradeConfigRequest(
        @NotNull @PositiveOrZero BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
