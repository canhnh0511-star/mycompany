package com.mycompany.api.dto;

import java.math.BigDecimal;

/** 1 dòng breakdown sản lượng theo Tổ trong {@link DashboardKpisResponse#productionByTeam()}. */
public record TeamProductionShareResponse(String teamName, BigDecimal kg) {
}
