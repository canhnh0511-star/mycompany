package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** 1 dòng / nhân viên có phát sinh sản lượng trong kỳ. kgByLatexType key = latex_type code. */
public record ProductionReportRow(
        UUID teamId, String teamName, UUID employeeId, String employeeName,
        Map<String, BigDecimal> kgByLatexType, BigDecimal totalKg) {
}
