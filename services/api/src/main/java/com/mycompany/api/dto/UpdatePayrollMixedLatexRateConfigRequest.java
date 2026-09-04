package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePayrollMixedLatexRateConfigRequest(
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
