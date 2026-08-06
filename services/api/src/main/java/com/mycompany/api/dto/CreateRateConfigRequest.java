package com.mycompany.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** effectiveTo = null nghĩa là đang hiệu lực (daterange coi NULL là vô cực) — CLAUDE.md §4. */
public record CreateRateConfigRequest(
        @NotNull UUID latexTypeId,
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
