package com.mycompany.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** 1 dòng trong request batch nhập tay (POST .../batch, ADR-0007). Không có employee_id — bán theo Tổ. */
public record CreateLatexSaleRequest(
        @NotNull LocalDate recordDate,
        @NotNull UUID teamId,
        @Size(max = 150) String buyerName,
        @Size(max = 150) String sellerSignedBy,
        String notes,
        @NotEmpty @Valid List<LatexItemRequest> items) {
}
