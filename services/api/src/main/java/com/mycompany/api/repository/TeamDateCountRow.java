package com.mycompany.api.repository;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Projection đếm dùng chung cho {@link ProductionRecordRepository#countApprovedEmployeesByTeamDate}
 * và {@link ProductionRecordRepository#countDocumentsByTeamDate} — 1 dòng / (Tổ, ngày) kèm 1 số đếm
 * (nghĩa của `count` do phương thức gọi quyết định: số nhân viên hoặc số phiếu).
 */
public record TeamDateCountRow(UUID teamId, LocalDate recordDate, long count) {
}
