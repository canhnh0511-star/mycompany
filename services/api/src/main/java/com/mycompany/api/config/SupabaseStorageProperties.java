package com.mycompany.api.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình Supabase Storage (bucket private "receipt-photos") — dùng service role key ở backend
 * để tạo signed upload URL cho client và tải lại ảnh khi gọi OCR. Xem docs/TASKS.md Open Question
 * đã resolve 2026-08-06: chỉ nhận JPEG/PNG, giới hạn 5MB (đúng giới hạn ảnh base64 của Claude API).
 */
@ConfigurationProperties(prefix = "app.supabase")
public record SupabaseStorageProperties(
        String url, String serviceRoleKey, String bucket, long maxUploadBytes, List<String> allowedContentTypes) {
}
