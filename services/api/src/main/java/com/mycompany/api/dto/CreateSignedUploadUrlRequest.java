package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;

/** contentType phải khớp danh sách app.supabase.allowed-content-types (mặc định image/jpeg, image/png). */
public record CreateSignedUploadUrlRequest(@NotBlank String contentType) {
}
