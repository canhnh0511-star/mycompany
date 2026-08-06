package com.mycompany.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record LatexSaleResponse(
        UUID id,
        LocalDate recordDate,
        UUID teamId,
        String teamName,
        String buyerName,
        String sellerSignedBy,
        String notes,
        String photoUrl,
        UUID ocrCallLogId,
        String lowConfidenceFields,
        UUID createdBy,
        Instant createdAt,
        String status,
        List<LatexItemResponse> items) {
}
