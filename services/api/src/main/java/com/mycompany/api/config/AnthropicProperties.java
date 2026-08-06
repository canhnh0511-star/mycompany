package com.mycompany.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình gọi Claude API (vision) cho luồng OCR — xem docs/adr/0005-synchronous-ocr-call.md.
 * {@code model} mặc định "claude-opus-5" theo khuyến nghị chung (đổi qua biến môi trường
 * ANTHROPIC_MODEL nếu muốn dùng model rẻ hơn cho tác vụ trích xuất — cân nhắc chi phí, xem
 * ocr_call_logs.estimated_cost_usd để theo dõi). KHÔNG hardcode logic theo giá trị model cụ thể
 * (CLAUDE.md/DB comment) — model đổi theo thời gian.
 */
@ConfigurationProperties(prefix = "app.anthropic")
public record AnthropicProperties(String apiKey, String model, String baseUrl) {
}
