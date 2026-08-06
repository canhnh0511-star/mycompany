package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateSignedUploadUrlRequest;
import com.mycompany.api.dto.OcrCaptureRequest;
import com.mycompany.api.dto.OcrCaptureResponse;
import com.mycompany.api.dto.SignedUploadUrlResponse;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.OcrCaptureService;
import com.mycompany.api.service.SupabaseStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Luồng OCR (CLAUDE.md §5, ADR-0005, ADR-0006). Gọi đồng bộ — request chờ tới khi Claude trả kết quả. */
@RestController
@RequestMapping("/api/v1/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final SupabaseStorageService storageService;
    private final OcrCaptureService ocrCaptureService;

    // Bước 1: xin URL để app upload TRỰC TIẾP lên Supabase Storage (không proxy binary qua backend).
    @PostMapping("/upload-url")
    public SignedUploadUrlResponse createUploadUrl(@Valid @RequestBody CreateSignedUploadUrlRequest request) {
        SupabaseStorageService.SignedUploadUrl signed = storageService.createSignedUploadUrl(request.contentType());
        return new SignedUploadUrlResponse(signed.objectPath(), signed.uploadUrl(), signed.token());
    }

    // Bước 2: sau khi app đã PUT xong ảnh lên uploadUrl ở bước 1, gọi capture với photoPath trả về.
    @PostMapping("/capture")
    public OcrCaptureResponse capture(@Valid @RequestBody OcrCaptureRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ocrCaptureService.capture(request, currentUser);
    }
}
