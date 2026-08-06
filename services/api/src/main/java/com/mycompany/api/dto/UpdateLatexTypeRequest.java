package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** code KHÔNG sửa được qua đây — xem CreateLatexTypeRequest. */
public record UpdateLatexTypeRequest(
        @NotBlank @Size(max = 50) String label,
        @Size(max = 10) String unit) {
}
