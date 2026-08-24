package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** GET /api/v1/production-summary/team/{teamId}/breakdown (Spec 2 §17, MUST). */
public record TeamBreakdownResponse(
        UUID teamId,
        String teamName,
        LocalDate workDate,
        BigDecimal totalKg,
        List<LatexTypeKg> byLatexType,
        List<EmployeeProductionRow> employees) {
}
