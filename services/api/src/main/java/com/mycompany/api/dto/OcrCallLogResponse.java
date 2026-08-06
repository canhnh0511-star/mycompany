package com.mycompany.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OcrCallLogResponse(
        UUID id,
        UUID calledBy,
        String calledByName,
        Instant calledAt,
        String targetType,
        String photoUrl,
        String model,
        int durationMs,
        boolean success,
        String errorMessage,
        boolean typeMismatch,
        Integer inputTokens,
        Integer outputTokens,
        BigDecimal estimatedCostUsd) {
}
