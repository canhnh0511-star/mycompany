package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * 1 nhân viên trong GET /production-summary/team/{id}/breakdown (Spec 2 §17/§22/§23/§24, MUST).
 * Tối đa 1 record/nhân viên/ngày (partial unique index uq_production_records_employee_date_active —
 * xem CLAUDE.md §4), nên không cần cấu trúc list-record-lồng-nhau.
 *
 * captureMethod/originContext — 2 dimension ĐỘC LẬP theo Spec 2 §23, KHÔNG gộp chung 1 field:
 *   captureMethod: "OCR" | "MANUAL"                 — record.source (RecordSource)
 *   originContext: "PRIMARY" | "SUPPLEMENT" | null   — scanBatch.batchType; null cho record nhập tay
 *                                                       (không đi qua Scan Session, ADR-0007)
 */
public record EmployeeProductionRow(
        UUID employeeId,
        String employeeName,
        UUID recordId,
        List<LatexTypeKg> byLatexType,
        // DRC chỉ có giá trị khi có item latexType=water (CLAUDE.md §4) — null nếu không cạo mủ nước.
        BigDecimal drcPercent,
        BigDecimal totalKg,
        String captureMethod,
        String originContext,
        String photoUrl,
        UUID scanImageId) {
}
