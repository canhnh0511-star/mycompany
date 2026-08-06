package com.mycompany.api.dto;

/**
 * photoPath — object path trong bucket private, dùng làm tham chiếu bền vững (production_records/
 * latex_sales.photo_url) và truyền vào OcrCaptureRequest.photoPath. uploadUrl+token — client PUT
 * trực tiếp file lên đây (không qua backend), có hiệu lực trong thời gian ngắn theo mặc định của
 * Supabase Storage signed upload URL.
 */
public record SignedUploadUrlResponse(String photoPath, String uploadUrl, String token) {
}
