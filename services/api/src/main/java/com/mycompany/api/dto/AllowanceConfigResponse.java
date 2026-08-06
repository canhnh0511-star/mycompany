package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AllowanceConfigResponse(
        UUID id,
        String code,
        String name,
        String calcType,
        BigDecimal unitPrice,
        LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
