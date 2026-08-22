package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateSignedUploadUrlRequest;
import com.mycompany.api.dto.SignedUploadUrlResponse;
import com.mycompany.api.service.SupabaseStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Upload ảnh (bước 1/2 của luồng quét — CLAUDE.md §5, ADR-0005). Bước 2 (OCR + tạo draft) chuyển
 * sang {@code POST /api/v1/scan-batches/images} (0021-scan-batch-model, ScanBatchController) —
 * endpoint {@code POST /ocr/capture} cũ đã bị XÓA, không giữ song song 2 code path.
 */
@RestController
@RequestMapping("/api/v1/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final SupabaseStorageService storageService;

    // Xin URL để app upload TRỰC TIẾP lên Supabase Storage (không proxy binary qua backend).
    @PostMapping("/upload-url")
    public SignedUploadUrlResponse createUploadUrl(@Valid @RequestBody CreateSignedUploadUrlRequest request) {
        SupabaseStorageService.SignedUploadUrl signed = storageService.createSignedUploadUrl(request.contentType());
        return new SignedUploadUrlResponse(signed.objectPath(), signed.uploadUrl(), signed.token());
    }
}
