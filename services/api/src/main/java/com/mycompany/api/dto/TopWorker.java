package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** 1 dòng trong bảng "Top công nhân theo sản lượng" (spec §9). */
public record TopWorker(UUID employeeId, String employeeName, UUID teamId, String teamName, BigDecimal productionKg) {
}
