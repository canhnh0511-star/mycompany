package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** GET /api/v1/dashboard/teams — khớp {@code TeamStatusRow} phía FE — 1 dòng / Tổ, kể cả Tổ chưa có dữ liệu ngày đó. */
public record TeamStatusRowResponse(
        UUID teamId,
        String teamName,
        BigDecimal productionKg,
        int workforcePresent,
        int workforceExpected,
        BigDecimal soldKg,
        String status // complete | missing | needs_review
) {
}
