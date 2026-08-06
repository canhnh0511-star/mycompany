package com.mycompany.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mycompany.api.config.AnthropicProperties;
import com.mycompany.api.config.SupabaseStorageProperties;
import com.mycompany.api.dto.BatchResult.BatchItemResult;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.dto.LatexSaleResponse;
import com.mycompany.api.dto.OcrCaptureRequest;
import com.mycompany.api.dto.OcrCaptureResponse;
import com.mycompany.api.dto.OcrUnmatchedLine;
import com.mycompany.api.dto.ProductionRecordResponse;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.OcrCallLogRepository;
import com.mycompany.api.repository.TeamRepository;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestration luồng OCR (CLAUDE.md §5, ADR-0005, ADR-0006): tải ảnh từ Supabase Storage → gọi
 * Claude Vision → LUÔN ghi 1 dòng ocr_call_logs (thành công hay lỗi) → nếu khớp targetType, tạo
 * NGAY (các) draft row + fuzzy-match nhân viên (production_records) hoặc gán thẳng team
 * (latex_sales, không cần match). Ảnh không khớp targetType → KHÔNG tạo draft.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrCaptureService {

    // Giá tại thời điểm viết (2026-08-06) — KHÔNG hardcode logic theo giá trị model cụ thể, chỉ
    // dùng để ước tính chi phí hiển thị cho Admin theo dõi (ocr_call_logs.estimated_cost_usd).
    // Model không có trong bảng này (vd khi Anthropic ra model mới chưa cập nhật) → trả null,
    // không đoán bừa. Cần cập nhật thủ công khi đổi giá.
    private static final Map<String, double[]> PRICING_USD_PER_MTOK = Map.of(
            "claude-opus-5", new double[] {5.00, 25.00},
            "claude-sonnet-5", new double[] {3.00, 15.00},
            "claude-haiku-4-5", new double[] {1.00, 5.00});

    private final SupabaseStorageService storageService;
    private final SupabaseStorageProperties storageProperties;
    private final ClaudeOcrService claudeOcrService;
    private final AnthropicProperties anthropicProperties;
    private final OcrCallLogRepository ocrCallLogRepository;
    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final EmployeeFuzzyMatcher fuzzyMatcher;
    private final ProductionRecordService productionRecordService;
    private final LatexSaleService latexSaleService;

    @Transactional
    public OcrCaptureResponse capture(OcrCaptureRequest request, User currentUser) {
        if (request.targetType() == OcrTargetType.LATEX_SALE && request.teamId() == null) {
            throw new InvalidRequestException("teamId bắt buộc khi targetType=LATEX_SALE (latex_sales.team_id NOT NULL)");
        }

        byte[] imageBytes = storageService.download(request.photoPath());
        if (imageBytes.length > storageProperties.maxUploadBytes()) {
            throw new InvalidRequestException("Ảnh vượt quá giới hạn " + storageProperties.maxUploadBytes()
                    + " bytes — chụp/chọn lại ảnh nhỏ hơn");
        }
        String mediaType = guessMediaType(request.photoPath());

        ClaudeOcrService.OcrCallResult result = claudeOcrService.analyze(imageBytes, mediaType, request.targetType());

        OcrCallLog callLog = OcrCallLog.builder()
                .calledBy(currentUser)
                .targetType(request.targetType())
                .photoUrl(request.photoPath())
                .model(anthropicProperties.model())
                .durationMs(result.durationMs())
                .success(result.success())
                .errorMessage(result.errorMessage())
                .typeMismatch(false)
                .inputTokens(result.inputTokens())
                .outputTokens(result.outputTokens())
                .estimatedCostUsd(estimateCost(result.inputTokens(), result.outputTokens()))
                .build();

        if (!result.success()) {
            // Log WARN — lỗi kỹ thuật khi gọi OCR, tự phục hồi được (Admin chụp lại) — CLAUDE.md §7.
            log.warn("OCR call thất bại (targetType={}): {}", request.targetType(), result.errorMessage());
            OcrCallLog saved = ocrCallLogRepository.saveAndFlush(callLog);
            return new OcrCaptureResponse(saved.getId(), false, result.errorMessage(), false, null, null, null, null);
        }

        JsonNode input = result.toolInput();
        boolean typeMismatch = input.path("type_mismatch").asBoolean(false);
        callLog.setTypeMismatch(typeMismatch);
        OcrCallLog savedLog = ocrCallLogRepository.saveAndFlush(callLog);

        if (typeMismatch) {
            String reason = input.path("mismatch_reason").asText(null);
            log.warn("OCR type_mismatch: ảnh không khớp targetType đã chọn ({}) — {}", request.targetType(), reason);
            return new OcrCaptureResponse(savedLog.getId(), true, null, true, reason, null, null, null);
        }

        LocalDate recordDate = parseDate(input.path("record_date").asText(null));
        if (recordDate == null) {
            throw new InvalidRequestException(
                    "OCR không đọc được ngày trên phiếu — chụp lại rõ hơn hoặc dùng Nhập tay nhanh");
        }

        return request.targetType() == OcrTargetType.PRODUCTION_RECORD
                ? captureProductionRecords(input, recordDate, request.teamId(), savedLog, currentUser)
                : captureLatexSale(input, recordDate, request.teamId(), savedLog, currentUser);
    }

    private OcrCaptureResponse captureProductionRecords(JsonNode input, LocalDate recordDate, UUID teamIdHint,
            OcrCallLog callLog, User currentUser) {
        List<Employee> candidates = teamIdHint != null
                ? employeeRepository.findByTeamIdAndStatus(teamIdHint, EmployeeStatus.ACTIVE)
                : employeeRepository.findByStatus(EmployeeStatus.ACTIVE);

        List<BatchItemResult<ProductionRecordResponse>> results = new ArrayList<>();
        List<OcrUnmatchedLine> unmatched = new ArrayList<>();
        int index = 0;
        for (JsonNode row : input.path("rows")) {
            String rawName = row.path("employee_name_raw").asText(null);
            List<LatexItemRequest> items = parseItems(row.path("items"));
            String notes = row.path("notes").asText(null);
            List<String> lowConfidence = parseStringArray(row.path("low_confidence_fields"));

            Optional<Employee> matched = fuzzyMatcher.match(rawName, candidates);
            if (matched.isEmpty()) {
                // Không tự đoán khi không chắc — trả nguyên dữ liệu để Admin chọn thủ công
                // (CLAUDE.md §9), xử lý tiếp qua Nhập tay nhanh/batch endpoint sẵn có ở Phase 2.
                unmatched.add(new OcrUnmatchedLine(rawName, items, notes, lowConfidence));
                continue;
            }
            int currentIndex = index++;
            try {
                ProductionRecordResponse created = productionRecordService.createDraftFromOcr(
                        recordDate, matched.get().getId(), notes, items, callLog, lowConfidence, currentUser);
                results.add(BatchItemResult.ok(currentIndex, created));
            } catch (RuntimeException ex) {
                results.add(BatchItemResult.failed(currentIndex, resolveErrorMessage(ex)));
            }
        }
        return new OcrCaptureResponse(callLog.getId(), true, null, false, null, results, null, unmatched);
    }

    private OcrCaptureResponse captureLatexSale(JsonNode input, LocalDate recordDate, UUID teamId,
            OcrCallLog callLog, User currentUser) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId));
        String buyerName = input.path("buyer_name").asText(null);
        String sellerSignedBy = input.path("seller_signed_by").asText(null);
        String notes = input.path("notes").asText(null);
        List<LatexItemRequest> items = parseItems(input.path("items"));
        List<String> lowConfidence = parseStringArray(input.path("low_confidence_fields"));

        try {
            LatexSaleResponse created = latexSaleService.createDraftFromOcr(
                    recordDate, team, buyerName, sellerSignedBy, notes, items, callLog, lowConfidence, currentUser);
            return new OcrCaptureResponse(callLog.getId(), true, null, false, null, null,
                    List.of(BatchItemResult.ok(0, created)), null);
        } catch (RuntimeException ex) {
            return new OcrCaptureResponse(callLog.getId(), true, null, false, null, null,
                    List.of(BatchItemResult.failed(0, resolveErrorMessage(ex))), null);
        }
    }

    private List<LatexItemRequest> parseItems(JsonNode itemsNode) {
        List<LatexItemRequest> items = new ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            String code = itemNode.path("latex_type_code").asText(null);
            java.math.BigDecimal kg = itemNode.hasNonNull("kg")
                    ? itemNode.get("kg").decimalValue() : null;
            java.math.BigDecimal drc = itemNode.hasNonNull("drc_percent")
                    ? itemNode.get("drc_percent").decimalValue() : null;
            UUID latexTypeId = code == null ? null : latexTypeRepository.findByCode(code).map(lt -> lt.getId()).orElse(null);
            if (latexTypeId == null || kg == null) {
                // Bỏ qua item thiếu dữ liệu bắt buộc — không throw để không làm hỏng cả dòng, chỉ
                // đơn giản là item đó không được đưa vào; low_confidence_fields đã cảnh báo riêng.
                log.warn("OCR trả item thiếu dữ liệu (latex_type_code={}, kg={}) — bỏ qua item này", code, kg);
                continue;
            }
            items.add(new LatexItemRequest(latexTypeId, kg, drc));
        }
        return items;
    }

    private List<String> parseStringArray(JsonNode arrayNode) {
        List<String> values = new ArrayList<>();
        for (JsonNode node : arrayNode) {
            values.add(node.asText());
        }
        return values;
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException e) {
            log.warn("Không parse được record_date OCR trả về: '{}'", raw);
            return null;
        }
    }

    private String guessMediaType(String objectPath) {
        String lower = objectPath.toLowerCase(Locale.ROOT);
        // objectPath do SupabaseStorageService tự sinh (luôn .jpg hoặc .png — xem createSignedUploadUrl)
        return lower.endsWith(".png") ? "image/png" : "image/jpeg";
    }

    private java.math.BigDecimal estimateCost(Integer inputTokens, Integer outputTokens) {
        if (inputTokens == null || outputTokens == null) {
            return null;
        }
        double[] pricing = PRICING_USD_PER_MTOK.get(anthropicProperties.model());
        if (pricing == null) {
            return null;
        }
        double cost = (inputTokens / 1_000_000.0) * pricing[0] + (outputTokens / 1_000_000.0) * pricing[1];
        return java.math.BigDecimal.valueOf(cost).setScale(6, java.math.RoundingMode.HALF_UP);
    }

    private String resolveErrorMessage(RuntimeException ex) {
        if (ex instanceof ConflictException || ex instanceof InvalidRequestException || ex instanceof NoSuchElementException) {
            return ex.getMessage();
        }
        if (ex instanceof DataIntegrityViolationException) {
            return "Dữ liệu vi phạm ràng buộc (trùng lặp hoặc tham chiếu không hợp lệ)";
        }
        log.warn("Lỗi không mong đợi khi tạo draft từ OCR: {}", ex.getMessage(), ex);
        return "Lỗi xử lý dòng này — vui lòng thử lại hoặc liên hệ hỗ trợ";
    }
}
