package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public record ProductionReportTeamSubtotal(
        UUID teamId, String teamName, Map<String, BigDecimal> kgByLatexType, BigDecimal totalKg) {
}
