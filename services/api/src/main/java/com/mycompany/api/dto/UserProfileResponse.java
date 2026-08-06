package com.mycompany.api.dto;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String fullName,
        String email,
        String role,
        String avatarUrl,
        String position) {
}
