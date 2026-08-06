package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Chỉ sửa được name/description — không có trường nào khác ở Team để sửa (CLAUDE.md §4). */
public record UpdateTeamRequest(
        @NotBlank @Size(max = 100) String name,
        String description) {
}
