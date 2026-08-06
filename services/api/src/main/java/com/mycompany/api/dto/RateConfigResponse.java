package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record RateConfigResponse(
        UUID id,
        UUID latexTypeId,
        String latexTypeCode,
        BigDecimal unitPrice,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        Instant createdAt) {
}
