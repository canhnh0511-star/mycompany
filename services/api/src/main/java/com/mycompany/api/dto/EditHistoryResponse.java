package com.mycompany.api.dto;

import java.time.Instant;
import java.util.UUID;

/** oldData/newData — nguyên chuỗi JSON đã lưu (snapshot AGGREGATE, CLAUDE.md §4), client tự JSON.parse. */
public record EditHistoryResponse(
        UUID id,
        String tableName,
        UUID recordId,
        UUID editedBy,
        String editedByName,
        Instant editedAt,
        String oldData,
        String newData) {
}
