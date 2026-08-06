package com.mycompany.api.dto;

import java.util.UUID;

public record LoginResponse(
        String accessToken,
        UUID userId,
        String fullName,
        String role) {
}
