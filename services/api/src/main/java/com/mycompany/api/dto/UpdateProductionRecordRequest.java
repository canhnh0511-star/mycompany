package com.mycompany.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Sửa aggregate toàn bộ — items truyền vào thay thế HOÀN TOÀN danh sách cũ (không patch từng item). */
public record UpdateProductionRecordRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID employeeId,
        String notes,
        @NotEmpty @Valid List<LatexItemRequest> items) {
}
