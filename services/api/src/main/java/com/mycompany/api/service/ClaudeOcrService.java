package com.mycompany.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.config.AnthropicProperties;
import com.mycompany.api.entity.OcrTargetType;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Gọi Claude API (vision) đồng bộ để đọc ảnh phiếu sổ ghi mủ/sổ bán mủ — xem
 * docs/adr/0005-synchronous-ocr-call.md và CLAUDE.md §5. Dùng Spring {@link RestClient} (có sẵn
 * từ spring-boot-starter-web) thay vì kéo thêm Anthropic Java SDK — quyết định đã chốt ở
 * docs/TASKS.md Phase 3 (CLAUDE.md §1/§9: dự án làm 1 mình, giữ dependency tối thiểu, "không thêm
 * trước khi cần" — xem ghi chú tương tự trong build.gradle.kts).
 *
 * <p>Ép JSON có cấu trúc bằng tool-use (function calling) với {@code tool_choice} bắt buộc gọi
 * đúng 1 tool tương ứng targetType — không dựa vào parse text tự do/regex. Bật adaptive thinking
 * (khuyến nghị chung cho tác vụ có phán đoán, ở đây là đọc chữ viết tay mờ + nhận định
 * type_mismatch) — đồng thời né 2 lỗi đã biết khi tắt thinking trên Claude Opus 5 (tool call lọt
 * ra text thường, thinking tag rò vào response — chỉ xảy ra khi thinking bị tắt).
 */
@Service
@Slf4j
public class ClaudeOcrService {

    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 4096;

    // JSON Schema cho tool "extract_production_records" — áp dụng khi targetType = PRODUCTION_RECORD.
    private static final String PRODUCTION_RECORD_TOOL_SCHEMA = """
            {
              "type": "object",
              "properties": {
                "type_mismatch": {
                  "type": "boolean",
                  "description": "true nếu ảnh này KHÔNG PHẢI là sổ ghi mủ cá nhân (production record) — vd nó là sổ bán mủ theo Tổ, hoặc ảnh không liên quan/không đọc được gì"
                },
                "mismatch_reason": {
                  "type": "string",
                  "description": "Chỉ điền khi type_mismatch = true — giải thích ngắn gọn tại sao ảnh không khớp"
                },
                "record_date": {
                  "type": "string",
                  "description": "Ngày ghi trên phiếu, định dạng YYYY-MM-DD. Để trống nếu không đọc được rõ."
                },
                "rows": {
                  "type": "array",
                  "description": "Mỗi phần tử tương ứng 1 công nhân trên phiếu. Để rỗng nếu type_mismatch = true.",
                  "items": {
                    "type": "object",
                    "properties": {
                      "employee_name_raw": {
                        "type": "string",
                        "description": "Tên công nhân đọc được trên phiếu, giữ nguyên chữ viết kể cả khi không chắc chắn"
                      },
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "latex_type_code": {"type": "string", "enum": ["water", "cup", "strip", "coagulated"]},
                            "kg": {
                              "type": "number",
                              "description": "CỘNG DỒN thành 1 số duy nhất nếu ô viết nhiều số (vd '79+49' nghĩa là 2 lần cạo/thu trong ngày → kg=128). KHÔNG được tách thành 2 item cùng latex_type_code — mỗi loại mủ chỉ 1 item/dòng."
                            },
                            "drc_percent": {
                              "type": "number",
                              "description": "CHỈ điền khi latex_type_code = water. Để trống nếu ô DRC bỏ trống trên phiếu."
                            }
                          },
                          "required": ["latex_type_code", "kg"]
                        }
                      },
                      "notes": {"type": "string"},
                      "low_confidence_fields": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tên các trường không chắc chắn của DÒNG NÀY do chữ viết mờ/khó đọc, vd 'employee_name', 'kg', 'drc_percent'"
                      }
                    },
                    "required": ["employee_name_raw", "items"]
                  }
                }
              },
              "required": ["type_mismatch", "rows"]
            }
            """;

    // JSON Schema cho tool "extract_latex_sale" — áp dụng khi targetType = LATEX_SALE.
    private static final String LATEX_SALE_TOOL_SCHEMA = """
            {
              "type": "object",
              "properties": {
                "type_mismatch": {
                  "type": "boolean",
                  "description": "true nếu ảnh này KHÔNG PHẢI là sổ bán mủ theo Tổ — vd nó là sổ ghi mủ cá nhân, hoặc ảnh không liên quan/không đọc được gì"
                },
                "mismatch_reason": {
                  "type": "string",
                  "description": "Chỉ điền khi type_mismatch = true — giải thích ngắn gọn tại sao ảnh không khớp"
                },
                "record_date": {"type": "string", "description": "Ngày ghi trên phiếu, định dạng YYYY-MM-DD"},
                "buyer_name": {"type": "string", "description": "Tên người mua/thương lái"},
                "seller_signed_by": {"type": "string", "description": "Tên người đại diện Tổ ký xác nhận bán"},
                "notes": {"type": "string"},
                "items": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "latex_type_code": {"type": "string", "enum": ["water", "cup", "strip", "coagulated"]},
                      "kg": {
                        "type": "number",
                        "description": "CỘNG DỒN thành 1 số duy nhất nếu ô viết nhiều số (vd nhiều lần thu trong ngày) — KHÔNG tách thành 2 item cùng latex_type_code, mỗi loại mủ chỉ 1 item/bản ghi"
                      },
                      "drc_percent": {"type": "number", "description": "CHỈ điền khi latex_type_code = water"}
                    },
                    "required": ["latex_type_code", "kg"]
                  }
                },
                "low_confidence_fields": {
                  "type": "array",
                  "items": {"type": "string"},
                  "description": "Tên các trường không chắc chắn do chữ viết mờ/khó đọc, vd 'buyer_name', 'kg'"
                }
              },
              "required": ["type_mismatch", "items"]
            }
            """;

    private final AnthropicProperties anthropicProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    // Constructor tường minh — xem ghi chú trong SupabaseStorageService về lý do không dùng Lombok
    // @RequiredArgsConstructor khi cần derive field khác (restClient) từ field injected.
    public ClaudeOcrService(AnthropicProperties anthropicProperties, ObjectMapper objectMapper) {
        this.anthropicProperties = anthropicProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(anthropicProperties.baseUrl()).build();
    }

    /** Kết quả 1 lần gọi Claude — {@code toolInput} null khi {@code success = false}. */
    public record OcrCallResult(
            boolean success, String errorMessage, int durationMs,
            Integer inputTokens, Integer outputTokens, JsonNode toolInput) {

        public static OcrCallResult success(int durationMs, Integer inputTokens, Integer outputTokens, JsonNode toolInput) {
            return new OcrCallResult(true, null, durationMs, inputTokens, outputTokens, toolInput);
        }

        public static OcrCallResult failure(int durationMs, String errorMessage) {
            return new OcrCallResult(false, errorMessage, durationMs, null, null, null);
        }
    }

    public OcrCallResult analyze(byte[] imageBytes, String mediaType, OcrTargetType targetType) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        Map<String, Object> requestBody = buildRequestBody(base64Image, mediaType, targetType);

        long start = System.currentTimeMillis();
        String responseBody;
        try {
            responseBody = restClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", anthropicProperties.apiKey())
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException ex) {
            int durationMs = (int) (System.currentTimeMillis() - start);
            log.warn("Lỗi gọi Claude Vision API ({}): {}", targetType, ex.getMessage());
            return OcrCallResult.failure(durationMs, "Lỗi gọi Claude API: " + ex.getMessage());
        }
        int durationMs = (int) (System.currentTimeMillis() - start);

        JsonNode root;
        try {
            root = objectMapper.readTree(responseBody);
        } catch (JsonProcessingException ex) {
            log.warn("Không parse được response JSON từ Claude API: {}", ex.getMessage());
            return OcrCallResult.failure(durationMs, "Response từ Claude API không phải JSON hợp lệ");
        }

        JsonNode usage = root.path("usage");
        Integer inputTokens = usage.has("input_tokens") ? usage.get("input_tokens").asInt() : null;
        Integer outputTokens = usage.has("output_tokens") ? usage.get("output_tokens").asInt() : null;

        for (JsonNode block : root.path("content")) {
            if ("tool_use".equals(block.path("type").asText())) {
                return OcrCallResult.success(durationMs, inputTokens, outputTokens, block.path("input"));
            }
        }
        String stopReason = root.path("stop_reason").asText("unknown");
        log.warn("Claude API không trả tool_use block (stop_reason={})", stopReason);
        return OcrCallResult.failure(durationMs, "Claude không trả kết quả có cấu trúc (stop_reason=" + stopReason + ")");
    }

    private Map<String, Object> buildRequestBody(String base64Image, String mediaType, OcrTargetType targetType) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", anthropicProperties.model());
        requestBody.put("max_tokens", MAX_TOKENS);
        // Adaptive thinking — mặc định trên ở model current-gen, đặt tường minh để hành vi nhất
        // quán kể cả khi đổi ANTHROPIC_MODEL sang model khác vẫn cần bật rõ ràng.
        requestBody.put("thinking", Map.of("type", "adaptive"));
        requestBody.put("output_config", Map.of("effort", "medium"));
        requestBody.put("tools", List.of(buildTool(targetType)));
        requestBody.put("tool_choice", Map.of("type", "tool", "name", toolName(targetType)));
        requestBody.put("messages", List.of(Map.of(
                "role", "user",
                "content", List.of(
                        Map.of("type", "image", "source", Map.of(
                                "type", "base64", "media_type", mediaType, "data", base64Image)),
                        Map.of("type", "text", "text", buildPrompt(targetType))))));
        return requestBody;
    }

    private Map<String, Object> buildTool(OcrTargetType targetType) {
        String schemaJson = targetType == OcrTargetType.PRODUCTION_RECORD
                ? PRODUCTION_RECORD_TOOL_SCHEMA : LATEX_SALE_TOOL_SCHEMA;
        Object schema;
        try {
            schema = objectMapper.readValue(schemaJson, Object.class);
        } catch (JsonProcessingException e) {
            // Schema là hằng số tĩnh — lỗi ở đây nghĩa là bug lập trình (JSON schema viết sai cú
            // pháp), không phải điều kiện runtime bình thường.
            throw new IllegalStateException("Tool schema JSON không hợp lệ cho targetType=" + targetType, e);
        }
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", toolName(targetType));
        tool.put("description", "Trích xuất dữ liệu từ ảnh "
                + (targetType == OcrTargetType.PRODUCTION_RECORD ? "sổ ghi mủ cá nhân" : "sổ bán mủ theo Tổ"));
        tool.put("input_schema", schema);
        return tool;
    }

    private String toolName(OcrTargetType targetType) {
        return targetType == OcrTargetType.PRODUCTION_RECORD ? "extract_production_records" : "extract_latex_sale";
    }

    private String buildPrompt(OcrTargetType targetType) {
        String common = "Bạn đang phân tích ảnh chụp 1 trang sổ tay viết tay của trại khai thác mủ cao su Việt "
                + "Nam. Chữ viết có thể mờ, nghiêng, hoặc khó đọc. Nếu 1 ô của 1 loại mủ ghi NHIỀU số cộng nhau "
                + "(vd '79+49', nghĩa là nhiều lần cạo/thu trong ngày) → CỘNG DỒN thành 1 số kg duy nhất cho loại "
                + "mủ đó, KHÔNG được tách thành 2 item cùng loại mủ trong cùng 1 dòng/bản ghi (mỗi loại mủ chỉ "
                + "được xuất hiện đúng 1 lần). ";
        if (targetType == OcrTargetType.PRODUCTION_RECORD) {
            return common
                    + "Đây PHẢI là sổ ghi mủ cá nhân: mỗi dòng tương ứng 1 công nhân, ghi khối lượng theo từng "
                    + "loại mủ (mủ nước=water, mủ chén=cup, mủ dây=strip, mủ đông=coagulated; đơn vị kg) và % DRC "
                    + "(chỉ ghi kèm mủ nước, có thể để trống nếu phiếu không ghi). Nếu ảnh KHÔNG PHẢI loại phiếu "
                    + "này (vd là sổ bán mủ theo Tổ có chữ ký người mua, hoặc ảnh không liên quan), set "
                    + "type_mismatch=true, giải thích trong mismatch_reason, để rows rỗng — KHÔNG cố gán ép dữ "
                    + "liệu vào sai schema. Nếu khớp: đọc NGÀY ghi trên phiếu và TỪNG DÒNG công nhân. Trường nào "
                    + "không chắc chắn (chữ mờ/khó đọc) → liệt kê tên trường vào low_confidence_fields của đúng "
                    + "dòng đó thay vì đoán bừa. PHẢI gọi tool extract_production_records để trả kết quả.";
        }
        return common
                + "Đây PHẢI là sổ bán mủ theo Tổ cho người mua ngoài: có tên người mua, tên người đại diện Tổ ký "
                + "xác nhận, và khối lượng bán theo từng loại mủ (mủ nước=water, mủ chén=cup, mủ dây=strip, mủ "
                + "đông=coagulated; đơn vị kg), kèm % DRC nếu có (chỉ với mủ nước). Nếu ảnh KHÔNG PHẢI loại phiếu "
                + "này (vd là sổ ghi mủ cá nhân theo từng công nhân, hoặc ảnh không liên quan), set "
                + "type_mismatch=true, giải thích trong mismatch_reason, để items rỗng — KHÔNG cố gán ép dữ liệu "
                + "vào sai schema. Trường nào không chắc chắn → liệt kê tên trường vào low_confidence_fields thay "
                + "vì đoán bừa. PHẢI gọi tool extract_latex_sale để trả kết quả.";
    }
}
