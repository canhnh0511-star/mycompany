package com.mycompany.api.dto;

import java.util.UUID;

public record LatexTypeResponse(
        UUID id,
        String code,
        String label,
        String unit) {
}
