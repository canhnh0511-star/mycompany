package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TechnicalGradeConfigResponse(
        UUID id,
        String grade,
        BigDecimal unitPrice,
        LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
