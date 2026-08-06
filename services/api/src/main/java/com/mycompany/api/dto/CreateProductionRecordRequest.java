package com.mycompany.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * 1 dòng trong request batch nhập tay (POST .../batch, ADR-0007). Nhập tay ghi thẳng
 * source=manual, status=confirmed — KHÔNG qua draft (draft chỉ dành cho luồng OCR, ADR-0006).
 */
public record CreateProductionRecordRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID employeeId,
        String notes,
        @NotEmpty @Valid List<LatexItemRequest> items) {
}
