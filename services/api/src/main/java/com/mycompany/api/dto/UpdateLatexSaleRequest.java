package com.mycompany.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Sửa aggregate toàn bộ — items truyền vào thay thế HOÀN TOÀN danh sách cũ (không patch từng item). */
public record UpdateLatexSaleRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID teamId,
        @Size(max = 150) String buyerName,
        @Size(max = 150) String sellerSignedBy,
        String notes,
        @NotEmpty @Valid List<LatexItemRequest> items) {
}
