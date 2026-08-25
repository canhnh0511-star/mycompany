package com.mycompany.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.config.AnthropicProperties;
import com.mycompany.api.config.SupabaseStorageProperties;
import com.mycompany.api.dto.CaptureImageRequest;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.dto.OcrUnmatchedLine;
import com.mycompany.api.dto.ResolveConflictRequest;
import com.mycompany.api.dto.ResolveDateRequest;
import com.mycompany.api.dto.ScanBatchAuditLogResponse;
import com.mycompany.api.dto.ScanBatchConflictResponse;
import com.mycompany.api.dto.ScanBatchLookupResponse;
import com.mycompany.api.dto.ScanBatchResponse;
import com.mycompany.api.dto.ScanImageResponse;
import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.ConflictStatus;
import com.mycompany.api.entity.ConflictType;
import com.mycompany.api.entity.DateResolution;
import com.mycompany.api.entity.DateVerificationStatus;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanBatchConflict;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.ImageLatexTotalRow;
import com.mycompany.api.repository.OcrCallLogRepository;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ScanBatchAuditLogRepository;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Orchestration Scan Session/Batch (0021-scan-batch-model, Spec 1) — thay thế OcrCaptureService.
 * Thuật toán create/merge/reuse (mục 2-3, ủy quyền {@link ScanBatchCreationService} — xem javadoc
 * class đó về LÝ DO tách riêng, không chỉ tổ chức code), date verification (mục 4), resolve mismatch
 * + PENDING_MOVE (mục 5), recompute batch status (mục 5.2, ủy quyền BatchStatusRecomputeService),
 * conflict detection (mục 6), approve/cancel/retry (mục 1). Riêng production_records: nếu nhân viên
 * khớp có khai báo sẵn vợ/chồng (employees.spouse_employee_id), 1 dòng OCR tự tách thành 2 draft
 * chia đôi kg (xem splitBetweenSpouses, port từ OcrCaptureService cũ khi verify Phase 1/2 trên DB
 * thật — ADR-0021 addendum) — Claude KHÔNG biết khái niệm này, việc tách xử lý hoàn toàn ở tầng
 * service.
 *
 * <p>KHÔNG @Transactional ở method orchestration cấp cao (captureImage/processOcr/...) — cùng lý do
 * đã ghi ở OcrCaptureService gốc: nếu bọc cả method, exception ở 1 bước con (vd tạo draft record thất
 * bại do trùng unique index) sẽ đánh dấu rollback-only cho CẢ transaction, kéo theo mất luôn
 * ocr_call_logs/ScanImage đã ghi. Method con nào cần transaction thật (advisory lock, ghi
 * nhiều bảng nhất quán) tự khai báo @Transactional riêng — mỗi lời gọi tự mở + commit độc lập.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScanBatchService {

    private static final Map<String, double[]> PRICING_USD_PER_MTOK = Map.of(
            "claude-opus-5", new double[] {5.00, 25.00},
            "claude-sonnet-5", new double[] {3.00, 15.00},
            "claude-haiku-4-5", new double[] {1.00, 5.00});

    // Cùng TTL với ProductionRecordService/LatexSaleService (1 giờ đủ cho 1 phiên review trên điện thoại).
    private static final int PHOTO_READ_URL_TTL_SECONDS = 3600;

    // Dùng chung cho verifyColumnTotals (mở conflict) và recheckTotalMismatch (kiểm tra lại sau khi
    // Admin sửa) — cùng 1 ngưỡng chấp nhận sai số làm tròn viết tay/cộng tay.
    private static final BigDecimal TOTAL_MISMATCH_TOLERANCE_KG = new BigDecimal("0.5");

    private final ScanBatchRepository scanBatchRepository;
    private final ScanImageRepository scanImageRepository;
    private final ScanBatchAuditLogRepository auditLogRepository;
    private final ScanBatchCreationService creationService;
    private final ScanBatchConflictService conflictService;
    private final ScanBatchAuditLogService auditLogService;
    private final BatchStatusRecomputeService recomputeService;
    private final DateVerificationService dateVerificationService;
    private final SupabaseStorageService storageService;
    private final SupabaseStorageProperties storageProperties;
    private final ClaudeOcrService claudeOcrService;
    private final AnthropicProperties anthropicProperties;
    private final OcrCallLogRepository ocrCallLogRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeFuzzyMatcher fuzzyMatcher;
    private final ProductionRecordService productionRecordService;
    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final LatexSaleService latexSaleService;
    private final ObjectMapper objectMapper;
    private final LatexTypeItemParser itemParser;

    // ============================================================= mục 1 — lookup trước khi chụp

    public ScanBatchLookupResponse lookup(OcrTargetType documentType, UUID teamId, LocalDate workDate) {
        Optional<ScanBatch> existing = creationService.findLatestPrimary(documentType, workDate, teamId);
        if (existing.isEmpty()) {
            return new ScanBatchLookupResponse(null, null, false);
        }
        ScanBatch batch = existing.get();
        boolean blocked = batch.getStatus() == BatchStatus.FAILED || batch.getStatus() == BatchStatus.APPROVED;
        return new ScanBatchLookupResponse(batch.getId(), batch.getStatus().name(), blocked);
    }

    // ============================================================= capture ảnh (thay OcrCaptureService)

    public ScanBatchResponse captureImage(CaptureImageRequest request, User currentUser) {
        // RULE 4 — dedup retry-upload: gọi lại đúng clientImageId trả về trạng thái hiện có, không
        // xử lý lại từ đầu (client tự gọi /retry nếu muốn thử lại ảnh FAILED).
        Optional<ScanImage> existingImage = scanImageRepository.findByClientImageId(request.clientImageId());
        if (existingImage.isPresent()) {
            return buildResponse(existingImage.get().getScanBatch().getId());
        }

        ScanBatch batch = creationService.resolveOrCreateBatchForImage(request.documentType(), request.workDate(), request.teamId(), currentUser);

        ScanImage image = scanImageRepository.save(ScanImage.builder()
                .scanBatch(batch)
                .storagePath(request.photoPath())
                .clientImageId(request.clientImageId())
                .status(ImageStatus.PROCESSING)
                .uploadedBy(currentUser)
                .build());
        recomputeService.recompute(batch.getId());

        processOcr(image, currentUser);

        UUID batchId = image.getScanBatch().getId(); // có thể đã đổi nếu logic tương lai reparent ngay lúc capture
        recomputeService.recompute(batchId);
        return buildResponse(batchId);
    }

    public ScanBatchResponse retryImage(UUID imageId, User currentUser) {
        ScanImage image = scanImageRepository.findById(imageId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_image với id=" + imageId));
        if (image.getStatus() != ImageStatus.FAILED) {
            throw new ConflictException("Chỉ retry được ảnh đang FAILED (hiện tại: " + image.getStatus() + ")");
        }
        conflictService.openForImage(imageId).stream()
                .filter(c -> c.getConflictType() == ConflictType.IMAGE_QUALITY_OR_OCR_FAILED)
                .forEach(c -> conflictService.resolve(c, ConflictStatus.RESOLVED, "RETRY", currentUser));
        image.setStatus(ImageStatus.PROCESSING);
        image.setErrorMessage(null);
        scanImageRepository.save(image);
        recomputeService.recompute(image.getScanBatch().getId());

        processOcr(image, currentUser);

        UUID batchId = image.getScanBatch().getId();
        auditLogService.logByUser(image.getScanBatch(), image, "IMAGE_RETRIED", currentUser);
        recomputeService.recompute(batchId);
        return buildResponse(batchId);
    }

    // Xóa 1 ảnh chụp/chọn NHẦM khỏi batch (vd chụp nhầm màn hình app khác — type_mismatch) — chỉ cho
    // phép với ảnh đang FAILED (ảnh ACTIVE đã tạo draft record, xóa sẽ mất dấu vết đối chiếu, phải đi
    // qua resolve-conflict DISCARD đúng luồng thay vì xóa thẳng). Soft-remove: tái dùng ImageStatus.
    // REPLACED (đã có sẵn cho luồng "chụp lại ảnh" tương lai — RULE 6, entity ScanImage) thay vì thêm
    // status mới — cùng ý nghĩa "không còn là dữ liệu active, loại khỏi mọi tính toán"
    // (BatchStatusRecomputeService đã filter sẵn REPLACED). Không xóa vật lý row (giữ ảnh gốc + audit
    // log để đối chiếu khi cần, đúng CLAUDE.md §4). Phát hiện thiếu tính năng này khi test thật trên
    // iPhone (2026-08-22) — ảnh FAILED không có cách nào dọn khỏi màn review ngoài hủy cả batch.
    public ScanBatchResponse removeImage(UUID imageId, User currentUser) {
        ScanImage image = scanImageRepository.findById(imageId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_image với id=" + imageId));
        // Mở rộng cho phép cả ACTIVE (không chỉ FAILED) — Admin phát hiện ảnh đã xử lý XONG nhưng đọc
        // sai (vd lệch tổng cột thật, ô "A+B" khó đọc) và muốn chụp lại thay vì sửa tay từng dòng, batch
        // CHƯA approve thì vẫn còn cơ hội sửa (phát hiện thiếu tính năng khi test thật trên iPhone
        // 2026-08-23 — chỉ có nút Thử lại/Xóa cho ảnh FAILED, không có cách nào với ảnh ACTIVE "sai
        // nhưng thành công"). Batch đã APPROVED thì record đã khóa (ADR-0006), không cho xóa nữa.
        ScanBatch batch = getBatchOrThrow(image.getScanBatch().getId());
        if (image.getStatus() != ImageStatus.FAILED && image.getStatus() != ImageStatus.ACTIVE) {
            throw new ConflictException("Chỉ xóa được ảnh đang FAILED hoặc ACTIVE (hiện tại: " + image.getStatus() + ")");
        }
        if (batch.getStatus() == BatchStatus.APPROVED || batch.getStatus() == BatchStatus.CANCELLED) {
            throw new ConflictException("Phiên đã " + batch.getStatus() + " — không xóa được ảnh nữa");
        }
        // Ảnh ACTIVE đã tạo draft record — hủy hết trước khi loại ảnh, tránh record mồ côi vẫn tính
        // vào tổng dù ảnh nguồn đã bị loại (cùng logic dùng khi resolve-conflict DISCARD).
        if (image.getStatus() == ImageStatus.ACTIVE) {
            cancelDraftsForImage(batch, imageId, currentUser);
        }
        conflictService.openForImage(imageId)
                .forEach(c -> conflictService.resolve(c, ConflictStatus.RESOLVED, "IMAGE_REMOVED", currentUser));
        image.setStatus(ImageStatus.REPLACED);
        scanImageRepository.save(image);

        UUID batchId = image.getScanBatch().getId();
        auditLogService.logByUser(image.getScanBatch(), image, "IMAGE_REMOVED", currentUser);
        recomputeService.recompute(batchId);
        return buildResponse(batchId);
    }

    public ScanBatchResponse retryBatch(UUID batchId, User currentUser) {
        ScanBatch batch = getBatchOrThrow(batchId);
        if (batch.getStatus() != BatchStatus.FAILED) {
            throw new ConflictException("Chỉ retry cả phiên khi đang FAILED (hiện tại: " + batch.getStatus() + ")");
        }
        List<ScanImage> failedImages = scanImageRepository.findByScanBatchIdAndStatus(batchId, ImageStatus.FAILED);
        for (ScanImage img : failedImages) {
            retryImage(img.getId(), currentUser);
        }
        auditLogService.logByUser(batch, null, "BATCH_RETRIED", currentUser);
        return buildResponse(batchId);
    }

    // Mục 1 UI "Hủy phiên này" — cho phép hủy từ bất kỳ trạng thái non-terminal nào (không chỉ
    // FAILED): Supplement cũng cần hủy được từ NEED_REVIEW/READY_TO_APPROVE khi user reject bổ sung
    // (Spec 1 mục 5 "Supplement bị REJECTED/CANCELLED", Case 22) — UI chỉ nổi bật nút này trên banner
    // FAILED của PRIMARY, nhưng backend không giới hạn cứng vào 1 status.
    public ScanBatchResponse cancelBatch(UUID batchId, User currentUser) {
        ScanBatch batch = getBatchOrThrow(batchId);
        if (batch.getStatus().isTerminal()) {
            throw new ConflictException("Batch đã ở trạng thái chung cuộc (" + batch.getStatus() + ") — không thể hủy");
        }
        // Hủy (soft, CLAUDE.md §4) các draft record còn lại thuộc batch — không mất dữ liệu, chỉ
        // chuyển CANCELLED, giữ nguyên trong DB để đối chiếu khi cần.
        for (ScanImage img : scanImageRepository.findByScanBatchId(batchId)) {
            cancelDraftsForImage(batch, img.getId(), currentUser);
        }
        batch.setStatus(BatchStatus.CANCELLED);
        scanBatchRepository.save(batch);
        auditLogService.logByUser(batch, null, "BATCH_CANCELLED", currentUser);

        if (batch.getBatchType() == BatchType.SUPPLEMENT) {
            revertPendingMoveForRejectedSupplement(batch, currentUser);
        }
        return buildResponse(batchId);
    }

    // ============================================================= mục 4 — OCR + date verification + conflict detect

    private void processOcr(ScanImage image, User currentUser) {
        ScanBatch batch = image.getScanBatch();
        byte[] imageBytes;
        try {
            imageBytes = storageService.download(image.getStoragePath());
        } catch (RuntimeException ex) {
            markImageFailed(batch, image, "Không tải được ảnh: " + ex.getMessage());
            return;
        }
        if (imageBytes.length > storageProperties.maxUploadBytes()) {
            markImageFailed(batch, image, "Ảnh vượt quá giới hạn " + storageProperties.maxUploadBytes() + " bytes");
            return;
        }

        String contentHash = sha256(imageBytes);
        image.setContentHash(contentHash);
        boolean duplicate = scanImageRepository.findByScanBatchId(batch.getId()).stream()
                .anyMatch(other -> !other.getId().equals(image.getId())
                        && other.getStatus() == ImageStatus.ACTIVE
                        && contentHash.equals(other.getContentHash()));
        if (duplicate) {
            conflictService.open(batch, image, null, null, ConflictType.DUPLICATE_IMAGE, true,
                    Map.of("reason", "contentHash trùng ảnh khác đang active trong cùng phiên"));
        }

        String mediaType = guessMediaType(image.getStoragePath());
        image.setOcrRunId(UUID.randomUUID());

        ClaudeOcrService.OcrCallResult result = claudeOcrService.analyze(imageBytes, mediaType, batch.getDocumentType());

        OcrCallLog callLog = OcrCallLog.builder()
                .calledBy(currentUser).targetType(batch.getDocumentType()).photoUrl(image.getStoragePath())
                .model(anthropicProperties.model()).durationMs(result.durationMs()).success(result.success())
                .errorMessage(result.errorMessage()).typeMismatch(false)
                .inputTokens(result.inputTokens()).outputTokens(result.outputTokens())
                .estimatedCostUsd(estimateCost(result.inputTokens(), result.outputTokens()))
                .build();

        if (!result.success()) {
            log.warn("OCR call thất bại (scanImageId={}, documentType={}): {}", image.getId(), batch.getDocumentType(), result.errorMessage());
            OcrCallLog saved = ocrCallLogRepository.saveAndFlush(callLog);
            image.setOcrCallLog(saved);
            markImageFailed(batch, image, result.errorMessage());
            conflictService.open(batch, image, null, null, ConflictType.IMAGE_QUALITY_OR_OCR_FAILED, true,
                    Map.of("reason", "ocr_call_failed", "errorMessage", String.valueOf(result.errorMessage())));
            return;
        }

        JsonNode input = result.toolInput();
        boolean typeMismatch = input.path("type_mismatch").asBoolean(false);
        callLog.setTypeMismatch(typeMismatch);
        OcrCallLog savedLog = ocrCallLogRepository.saveAndFlush(callLog);
        image.setOcrCallLog(savedLog);

        if (typeMismatch) {
            String reason = input.path("mismatch_reason").asText(null);
            log.warn("OCR type_mismatch (scanImageId={}, documentType={}): {}", image.getId(), batch.getDocumentType(), reason);
            markImageFailed(batch, image, "Ảnh không khớp loại phiếu đã chọn" + (reason != null ? ": " + reason : ""));
            conflictService.open(batch, image, null, null, ConflictType.IMAGE_QUALITY_OR_OCR_FAILED, true,
                    Map.of("reason", "type_mismatch", "mismatchReason", String.valueOf(reason)));
            return;
        }

        LocalDate ocrDate = parseDate(input.path("record_date").asText(null));
        DateVerificationService.Result dateResult = dateVerificationService.verify(batch.getWorkDate(), ocrDate);
        image.setDateVerificationStatus(dateResult.status());
        image.setDateResolution(dateResult.resolution());
        image.setOcrDetectedDate(ocrDate);
        image.setEffectiveWorkDate(dateResult.effectiveDate());
        image.setStatus(ImageStatus.ACTIVE);
        scanImageRepository.save(image);

        if (dateResult.status() == DateVerificationStatus.NOT_DETECTED) {
            // RULE 13 — tự resolve, không block, ghi audit performedBySystem=true.
            auditLogService.logBySystem(batch, image, "DATE_RESOLVED_FALLBACK_SESSION_DATE");
        } else if (dateResult.status() == DateVerificationStatus.MISMATCH) {
            conflictService.open(batch, image, null, null, ConflictType.DATE_MISMATCH, true,
                    Map.of("sessionWorkDate", batch.getWorkDate().toString(), "ocrDetectedDate", String.valueOf(ocrDate)));
        }

        if (batch.getDocumentType() == OcrTargetType.PRODUCTION_RECORD) {
            // Ghi lại NGAY số dòng OCR đọc được (trước khi map thành record/conflict) — không suy
            // ngược sau này được vì 1 dòng vợ/chồng tạo 2 record, 1 dòng lỗi số liệu vẫn tạo record +
            // conflict riêng. Chỉ áp dụng PRODUCTION_RECORD — LATEX_SALE không có khái niệm "rows"
            // (1 phiếu = 1 record theo Tổ, xem LATEX_SALE_TOOL_SCHEMA).
            image.setOcrRowCount(input.path("rows").size());
            scanImageRepository.save(image);
            captureProductionRecordRows(input, dateResult.effectiveDate(), batch, image, currentUser);
            verifyColumnTotals(input, batch, image);
        } else {
            captureLatexSaleRow(input, dateResult.effectiveDate(), batch, image, currentUser);
        }
    }

    // Đối chiếu dòng "Tổng cộng" OCR đọc được (nếu phiếu có) với tổng kg thực tế đã tạo record cho
    // ảnh này — bắt được lỗi OCR đọc nhầm CỘT (vd Mủ dây ghi nhầm thành Mủ đông) dù giá trị "trông"
    // hợp lý và KHÔNG bị model tự flag low_confidence, nên UI review không có tín hiệu nào khác để
    // Admin phát hiện (phát hiện thật khi test trên iPhone, phiếu ngày 23/08/2026 — 5/7 dòng đọc nhầm
    // cột được model báo "chắc chắn 100%"). Chạy SAU khi đã tạo xong record/conflict cho toàn bộ
    // dòng của ảnh — cần record đã persist để query tổng thực tế.
    private void verifyColumnTotals(JsonNode input, ScanBatch batch, ScanImage image) {
        JsonNode columnTotals = input.path("column_totals");
        if (!columnTotals.isArray() || columnTotals.isEmpty()) {
            return;
        }
        // Bỏ qua CHỈ khi ảnh còn UNKNOWN_EMPLOYEE hoặc POTENTIAL_DUPLICATE_OCR_ROW đang mở — 2 loại DUY
        // NHẤT khiến 1 dòng CHƯA tạo được record (xem createProductionDraft/captureProductionRecordRows),
        // nên kg của chúng chưa cộng vào tổng hệ thống, tự gây lệch dù không hề đọc nhầm cột. Các loại
        // khác (DATE_MISMATCH, INVALID_BUSINESS_VALUE — record VẪN được tạo dù bị flag, DUPLICATE_IMAGE...)
        // không ảnh hưởng tới việc dòng đã thành record hay chưa, KHÔNG được gate ở đây — lần đầu implement
        // gate theo "bất kỳ conflict nào" đã bỏ sót lệch tổng THẬT khi ảnh có kèm DATE_MISMATCH không liên
        // quan (phát hiện khi test thật trên iPhone 2026-08-23, phiếu ngày 19 Phong Phú).
        boolean hasIncompleteRowConflict = conflictService.openForImage(image.getId()).stream()
                .anyMatch(c -> c.getConflictType() == ConflictType.UNKNOWN_EMPLOYEE
                        || c.getConflictType() == ConflictType.POTENTIAL_DUPLICATE_OCR_ROW);
        if (hasIncompleteRowConflict) {
            return;
        }
        Map<String, BigDecimal> systemTotals = productionRecordItemRepository.sumKgByScanImage(image.getId()).stream()
                .collect(Collectors.toMap(ImageLatexTotalRow::latexTypeCode, ImageLatexTotalRow::totalKg));
        for (JsonNode entry : columnTotals) {
            String code = entry.path("latex_type_code").asText(null);
            if (code == null || !entry.hasNonNull("total_kg")) {
                continue;
            }
            BigDecimal ocrTotal = BigDecimal.valueOf(entry.path("total_kg").asDouble());
            BigDecimal systemTotal = systemTotals.getOrDefault(code, BigDecimal.ZERO);
            // Sai số nhỏ (làm tròn viết tay/cộng tay) chấp nhận được — chỉ chặn khi lệch thật sự.
            if (ocrTotal.subtract(systemTotal).abs().compareTo(TOTAL_MISMATCH_TOLERANCE_KG) > 0) {
                conflictService.open(batch, image, null, null, ConflictType.TOTAL_MISMATCH, true,
                        Map.of("latexTypeCode", code, "ocrTotal", ocrTotal, "systemTotal", systemTotal));
            }
        }
    }

    private record TotalMismatchDetail(String latexTypeCode, BigDecimal ocrTotal, BigDecimal systemTotal) {
    }

    // Admin sửa số liệu trực tiếp trong bảng record (PATCH) sau khi thấy cảnh báo TOTAL_MISMATCH — bảng
    // không tự biết cảnh báo nào cần tính lại, nên frontend gọi endpoint này SAU MỖI LẦN lưu 1 dòng
    // thuộc ảnh đang có TOTAL_MISMATCH open (Spec 1 UX — phát hiện thiếu khi test thật trên iPhone
    // 2026-08-23: trước đây chỉ có "giữ nguyên"/"bỏ dòng", không có đường "tôi đã sửa xong"). Khớp lại
    // (trong dung sai) → tự resolve; vẫn lệch → cập nhật số systemTotal mới nhất lên detail, giữ OPEN.
    public ScanBatchResponse recheckTotalMismatch(UUID conflictId, User currentUser) {
        ScanBatchConflict conflict = conflictService.getOrThrow(conflictId);
        if (conflict.getConflictType() != ConflictType.TOTAL_MISMATCH) {
            throw new InvalidRequestException("Chỉ áp dụng cho conflict TOTAL_MISMATCH");
        }
        if (conflict.getStatus() != ConflictStatus.OPEN) {
            throw new ConflictException("Conflict id=" + conflictId + " đã được xử lý trước đó (status=" + conflict.getStatus() + ")");
        }
        TotalMismatchDetail detail;
        try {
            detail = objectMapper.readValue(conflict.getDetail(), TotalMismatchDetail.class);
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được conflict detail (TOTAL_MISMATCH): " + conflict.getDetail(), e);
        }
        // .getId() trên quan hệ LAZY an toàn (không cần init proxy) — cùng lý do đã ghi ở resolveConflict,
        // KHÔNG gọi thêm getter nào khác trên conflict.getScanImage()/getScanBatch() ở method này.
        UUID scanImageId = conflict.getScanImage().getId();
        ScanBatch batch = getBatchOrThrow(conflict.getScanBatch().getId());

        Map<String, BigDecimal> systemTotals = productionRecordItemRepository.sumKgByScanImage(scanImageId).stream()
                .collect(Collectors.toMap(ImageLatexTotalRow::latexTypeCode, ImageLatexTotalRow::totalKg));
        BigDecimal systemTotal = systemTotals.getOrDefault(detail.latexTypeCode(), BigDecimal.ZERO);

        if (detail.ocrTotal().subtract(systemTotal).abs().compareTo(TOTAL_MISMATCH_TOLERANCE_KG) <= 0) {
            conflictService.resolve(conflict, ConflictStatus.RESOLVED, "RECHECKED_MATCH", currentUser);
        } else {
            conflictService.updateDetail(conflict, Map.of(
                    "latexTypeCode", detail.latexTypeCode(), "ocrTotal", detail.ocrTotal(), "systemTotal", systemTotal));
        }
        auditLogService.logByUser(batch, conflict.getScanImage(), "TOTAL_MISMATCH_RECHECKED", currentUser);
        recomputeService.recompute(batch.getId());
        return buildResponse(batch.getId());
    }

    private void captureProductionRecordRows(JsonNode input, LocalDate effectiveDate, ScanBatch batch, ScanImage image, User currentUser) {
        List<Employee> candidates = employeeRepository.findByTeamIdAndStatus(batch.getTeam().getId(), EmployeeStatus.ACTIVE);
        JsonNode rows = input.path("rows");
        for (int i = 0; i < rows.size(); i++) {
            JsonNode row = rows.get(i);
            // *2 để chừa 1 chỗ trống ngay sau cho vợ/chồng tách từ CÙNG dòng này (splitBetweenSpouses)
            // — đủ để sort đúng thứ tự phiếu giấy mà không cần biết trước dòng blank của vợ/chồng có
            // được OCR trả về hay không (Vấn đề 3, migration 013).
            int rowIndex = i * 2;
            String rawName = row.path("employee_name_raw").asText(null);
            List<LatexItemRequest> items = itemParser.parseItems(row.path("items"));
            String notes = row.path("notes").asText(null);
            List<String> lowConfidence = itemParser.parseStringArray(row.path("low_confidence_fields"));

            if (items.isEmpty()) {
                // Dòng tên có trên phiếu nhưng KHÔNG ghi số liệu — thường là vợ/chồng của người ở
                // dòng ngay trên (CLAUDE.md §5, sản lượng gộp chung vào dòng đó rồi, xem
                // splitBetweenSpouses bên dưới) hoặc đơn giản người này nghỉ hôm đó. Bỏ qua hoàn
                // toàn: không tạo production_record rỗng vô nghĩa (port từ OcrCaptureService cũ —
                // ADR-0021 addendum). Ghi audit hệ thống để Admin còn dấu vết đối chiếu khi cần.
                // newValue map jsonb (ScanBatchAuditLog.newValue @JdbcTypeCode(SqlTypes.JSON)) — PHẢI
                // là chuỗi JSON hợp lệ, không được truyền thẳng rawName dạng text thô (Postgres ném
                // "invalid input syntax for type json" ngay khi tên không phải null — phát hiện khi
                // test thật trên iPhone (2026-08-23), lộ ra ở bất kỳ phiếu nào có dòng tên bỏ trống số
                // liệu, không riêng gì ngày 14/08).
                auditLogService.log(batch, image, "ROW_SKIPPED_EMPTY_ITEMS", null, true, null,
                        writeJsonOrNull(Map.of("employeeNameRaw", String.valueOf(rawName))), null, null);
                // Nếu tên khớp 1 nhân viên CÓ vợ/chồng đang active — dòng trống này chính là dòng
                // "đã gộp chung" (splitBetweenSpouses xử lý ở dòng của người kia), KHÔNG phải trường
                // hợp mơ hồ "không cạo mủ". Không mở conflict cho case này nữa — báo "cần chú ý" ở
                // đây là nhiễu, làm Admin tưởng lỗi trong khi hệ thống đã xử lý đúng (phát hiện khi
                // test thật trên iPhone 2026-08-23). Chỉ mở conflict khi KHÔNG match được vợ/chồng —
                // vẫn giữ tín hiệu cho trường hợp thật sự không có số liệu (nghỉ/không cạo mủ).
                boolean explainedBySpouse = false;
                if (rawName != null && !rawName.isBlank()) {
                    Optional<Employee> maybeMatch = fuzzyMatcher.match(rawName, candidates);
                    explainedBySpouse = maybeMatch.isPresent() && resolveActiveSpouse(maybeMatch.get()) != null;
                }
                if (rawName != null && !rawName.isBlank() && !explainedBySpouse) {
                    conflictService.open(batch, image, null, null, ConflictType.EMPTY_ROW_SKIPPED, false,
                            Map.of("employeeNameRaw", rawName, "rowIndex", rowIndex));
                }
                continue;
            }

            Optional<Employee> matched = fuzzyMatcher.match(rawName, candidates);
            if (matched.isEmpty()) {
                // Xác nhận là format phiếu thật (không phải trường hợp hiếm) khi test trên iPhone
                // (2026-08-22): 1 số tổ ghi thẳng "Tên chồng - Tên vợ" chung 1 dòng, KHÁC giả định cũ
                // của splitBetweenSpouses (1 dòng chỉ 1 tên, hệ thống tự tra spouse_employee_id) —
                // rawName dạng ghép luôn dài hơn hẳn bất kỳ tên đơn nào nên fuzzyMatcher.match() trên
                // toàn chuỗi luôn dưới ngưỡng, rơi thẳng UNKNOWN_EMPLOYEE, tính năng chia đôi không có
                // cơ hội chạy. Thử tách "-" trước khi bó tay báo lỗi.
                Optional<Employee[]> pair = matchCoupleNamePair(rawName, candidates);
                if (pair.isPresent()) {
                    Employee first = pair.get()[0];
                    Employee second = pair.get()[1];
                    if (hasInvalidItem(items)) {
                        conflictService.open(batch, image, null, null, ConflictType.INVALID_BUSINESS_VALUE, true,
                                Map.of("employeeName", first.getFullName() + " / " + second.getFullName(),
                                        "reason", "kg/DRC ngoài khoảng hợp lệ"));
                    }
                    splitBetweenSpouses(batch, image, effectiveDate, first, second, items, notes, rawName, lowConfidence, rowIndex, currentUser);
                    continue;
                }
                // CLAUDE.md §9 — không tự đoán, lưu nguyên dữ liệu để Admin chọn thủ công qua
                // resolve-conflict (action=ASSIGN_EMPLOYEE).
                conflictService.open(batch, image, null, null, ConflictType.UNKNOWN_EMPLOYEE, true,
                        new OcrUnmatchedLine(rawName, items, notes, lowConfidence, rowIndex));
                continue;
            }
            if (hasInvalidItem(items)) {
                conflictService.open(batch, image, null, null, ConflictType.INVALID_BUSINESS_VALUE, true,
                        Map.of("employeeName", matched.get().getFullName(), "reason", "kg/DRC ngoài khoảng hợp lệ"));
            }

            Employee employee = matched.get();
            Employee spouse = resolveActiveSpouse(employee);
            if (spouse == null) {
                createProductionDraft(batch, image, effectiveDate, employee, items, notes, lowConfidence, rowIndex, currentUser);
            } else {
                splitBetweenSpouses(batch, image, effectiveDate, employee, spouse, items, notes, rawName, lowConfidence, rowIndex, currentUser);
            }
        }
    }

    // Phiếu ghi "Tên chồng - Tên vợ" chung 1 dòng (xem ghi chú ở captureProductionRecordRows) — tách
    // theo dấu gạch ngang, chỉ chấp nhận khi tách được ĐÚNG 2 phần khác rỗng và CẢ 2 phần đều fuzzy-
    // match ra 2 nhân viên KHÁC NHAU (tránh trường hợp tên có dấu "-" tự nhiên mà vô tình match trùng
    // 1 người, hoặc chỉ 1 nửa đọc được). Không đòi hỏi cấu hình employees.spouse_employee_id — phiếu
    // đã tự ghi rõ 2 người rồi, không cần tra cứu.
    private Optional<Employee[]> matchCoupleNamePair(String rawName, List<Employee> candidates) {
        if (rawName == null) {
            return Optional.empty();
        }
        String[] parts = rawName.split("\\s*[-–—]\\s*");
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            return Optional.empty();
        }
        Optional<Employee> first = fuzzyMatcher.match(parts[0], candidates);
        Optional<Employee> second = fuzzyMatcher.match(parts[1], candidates);
        if (first.isEmpty() || second.isEmpty() || first.get().getId().equals(second.get().getId())) {
            return Optional.empty();
        }
        return Optional.of(new Employee[] {first.get(), second.get()});
    }

    // Vợ/chồng cùng làm cạo mủ (CLAUDE.md §5, port từ OcrCaptureService cũ — xem ADR-0021 addendum) —
    // spouse phải đang active mới tách đôi; nếu đã nghỉ việc thì coi như không có, giữ nguyên hành vi
    // cũ (1 dòng → 1 draft).
    private Employee resolveActiveSpouse(Employee employee) {
        Employee spouse = employee.getSpouseEmployee();
        return spouse != null && spouse.getStatus() == EmployeeStatus.ACTIVE ? spouse : null;
    }

    // Phiếu giấy đôi khi chỉ ghi 1 dòng cho 1 người nhưng thực ra sản lượng đó là CHUNG của 2 vợ
    // chồng — chia đôi kg từng loại mủ, tạo 2 draft riêng (cùng trỏ về ocr_call_log/scan_image gốc).
    // DRC giữ nguyên cho cả 2 bên (đo trên mẻ, không cộng dồn theo khối lượng — CLAUDE.md §4). Đánh
    // dấu cột kg vào low_confidence_fields để Admin để ý, ghi chú rõ nguồn gốc để đối chiếu khi cần.
    private void splitBetweenSpouses(ScanBatch batch, ScanImage image, LocalDate effectiveDate, Employee employee,
            Employee spouse, List<LatexItemRequest> items, String notes, String rawName, List<String> lowConfidence,
            int rowIndex, User currentUser) {
        List<String> splitLowConfidence = withKgFlagged(lowConfidence);
        String splitNote = appendSplitNote(notes, rawName);

        // rowIndex/rowIndex+1 — cùng 1 dòng phiếu giấy, xếp liền kề nhau khi sort (Vấn đề 3).
        createProductionDraft(batch, image, effectiveDate, employee, halveItems(items, false), splitNote,
                splitLowConfidence, rowIndex, currentUser);
        createProductionDraft(batch, image, effectiveDate, spouse, halveItems(items, true), splitNote,
                splitLowConfidence, rowIndex + 1, currentUser);
    }

    private void createProductionDraft(ScanBatch batch, ScanImage image, LocalDate effectiveDate, Employee employee,
            List<LatexItemRequest> items, String notes, List<String> lowConfidence, int rowIndex, User currentUser) {
        try {
            productionRecordService.createDraftFromOcr(effectiveDate, employee.getId(), notes, items,
                    image.getOcrCallLog(), lowConfidence, image, rowIndex, currentUser);
        } catch (DataIntegrityViolationException | ConflictException ex) {
            // RULE 12 — không tự xóa/bỏ dòng, chỉ flag để user review (giữ cả 2 hoặc bỏ dòng mới).
            // Bắt cả ConflictException (không chỉ DataIntegrityViolationException): createDraftFromOcr
            // tự pre-check trùng active record (checkNoActiveDuplicate) và throw ConflictException
            // NGAY, không đợi tới ràng buộc DB — nếu chỉ bắt DataIntegrityViolationException, exception
            // này lọt thẳng lên captureImage/processOcr → toàn bộ request 409, HỦY luôn việc xử lý các
            // dòng khác trong cùng ảnh + không tạo được conflict để user review (vi phạm best-effort
            // per-row, ADR-0007) — phát hiện khi test thật trên iPhone (2026-08-22), lỗi 409 sau khi
            // OCR chạy xong ~12-25s vì đợi Claude Vision trả kết quả trước khi mới chạm tới check này.
            conflictService.open(batch, image, null, null, ConflictType.POTENTIAL_DUPLICATE_OCR_ROW, true,
                    Map.of("employeeName", employee.getFullName(),
                            "reason", "đã có bản ghi sản lượng active khác cho nhân viên/ngày này"));
        }
    }

    private static List<String> withKgFlagged(List<String> lowConfidence) {
        List<String> flagged = new ArrayList<>(lowConfidence != null ? lowConfidence : List.of());
        if (!flagged.contains("kg")) {
            flagged.add("kg");
        }
        return flagged;
    }

    private static String appendSplitNote(String notes, String rawName) {
        String note = "Tự động chia đôi từ dòng \"" + rawName + "\" (vợ/chồng) — kiểm tra lại số liệu";
        return notes == null || notes.isBlank() ? note : notes + " | " + note;
    }

    // Chia đôi kg từng item, giữ nguyên drcPercent (không chia — CLAUDE.md §4). roundUp=false lấy
    // floor(kg/2, scale 2), roundUp=true lấy phần còn lại (kg - floor) — cộng lại đúng bằng số gốc,
    // không làm tròn mất mát dù tổng có lẻ (khớp thực tế quan sát ở bảng lương nội bộ, vd 557kg →
    // 278/279kg).
    private static List<LatexItemRequest> halveItems(List<LatexItemRequest> items, boolean roundUp) {
        return items.stream()
                .map(item -> {
                    BigDecimal half = item.kg().divide(BigDecimal.valueOf(2), 2, RoundingMode.DOWN);
                    BigDecimal kg = roundUp ? item.kg().subtract(half) : half;
                    return new LatexItemRequest(item.latexTypeId(), kg, item.drcPercent());
                })
                .toList();
    }

    private void captureLatexSaleRow(JsonNode input, LocalDate effectiveDate, ScanBatch batch, ScanImage image, User currentUser) {
        Team team = batch.getTeam();
        String buyerName = input.path("buyer_name").asText(null);
        String sellerSignedBy = input.path("seller_signed_by").asText(null);
        String notes = input.path("notes").asText(null);
        List<LatexItemRequest> items = itemParser.parseItems(input.path("items"));
        List<String> lowConfidence = itemParser.parseStringArray(input.path("low_confidence_fields"));

        if (hasInvalidItem(items)) {
            conflictService.open(batch, image, null, null, ConflictType.INVALID_BUSINESS_VALUE, true,
                    Map.of("reason", "kg/DRC ngoài khoảng hợp lệ"));
        }
        try {
            latexSaleService.createDraftFromOcr(effectiveDate, team, buyerName, sellerSignedBy, notes, items,
                    image.getOcrCallLog(), lowConfidence, image, currentUser);
        } catch (DataIntegrityViolationException ex) {
            conflictService.open(batch, image, null, null, ConflictType.POTENTIAL_DUPLICATE_OCR_ROW, true,
                    Map.of("reason", "vi phạm ràng buộc dữ liệu"));
        }
    }

    private boolean hasInvalidItem(List<LatexItemRequest> items) {
        return items.stream().anyMatch(i -> i.kg().signum() < 0
                || (i.drcPercent() != null && (i.drcPercent().signum() < 0 || i.drcPercent().compareTo(BigDecimal.valueOf(100)) > 0)));
    }

    private void markImageFailed(ScanBatch batch, ScanImage image, String errorMessage) {
        image.setStatus(ImageStatus.FAILED);
        image.setErrorMessage(errorMessage);
        scanImageRepository.save(image);
    }

    // ============================================================= mục 5 — resolve date mismatch + PENDING_MOVE

    public ScanBatchResponse resolveDate(UUID imageId, ResolveDateRequest request, User currentUser) {
        if (request.resolution() != DateResolution.KEEP_SESSION_DATE && request.resolution() != DateResolution.CHANGE_DATE) {
            throw new InvalidRequestException("resolution chỉ chấp nhận KEEP_SESSION_DATE hoặc CHANGE_DATE");
        }
        ScanImage image = scanImageRepository.findById(imageId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_image với id=" + imageId));
        if (image.getDateVerificationStatus() != DateVerificationStatus.MISMATCH) {
            throw new ConflictException("Ảnh id=" + imageId + " không ở trạng thái MISMATCH — không cần resolve");
        }
        ScanBatch sourceBatch = image.getScanBatch();

        if (request.resolution() == DateResolution.KEEP_SESSION_DATE) {
            image.setDateResolution(DateResolution.KEEP_SESSION_DATE);
            scanImageRepository.save(image);
            closeDateMismatchConflict(imageId, currentUser, "KEEP_SESSION_DATE");
            auditLogService.logByUser(sourceBatch, image, "DATE_RESOLVED_KEEP", currentUser);
            recomputeService.recompute(sourceBatch.getId());
            return buildResponse(sourceBatch.getId());
        }

        // CHANGE_DATE (RULE 8/9)
        LocalDate targetDate = image.getOcrDetectedDate();
        Optional<ScanBatch> targetOpt = creationService.findLatestPrimary(sourceBatch.getDocumentType(), targetDate, sourceBatch.getTeam().getId());

        if (targetOpt.isEmpty() || targetOpt.get().getStatus().isMergeable()) {
            // RULE 8 — merge thẳng (tạo mới nếu chưa có, hoặc merge vào batch đích đang sống).
            ScanBatch target = creationService.resolveOrCreateBatchForImage(sourceBatch.getDocumentType(), targetDate, sourceBatch.getTeam().getId(), currentUser);
            reparentImageAndRecords(image, target, targetDate);
            image.setDateResolution(DateResolution.CHANGE_DATE);
            scanImageRepository.save(image);
            closeDateMismatchConflict(imageId, currentUser, "CHANGE_DATE");
            auditLogService.log(sourceBatch, image, "DATE_RESOLVED_CHANGE_MERGE", currentUser, false, null, null,
                    sourceBatch.getId(), target.getId());
            recomputeService.recompute(sourceBatch.getId());
            recomputeService.recompute(target.getId());
            return buildResponse(target.getId());
        }

        ScanBatch target = targetOpt.get();
        if (target.getStatus() == BatchStatus.FAILED) {
            throw new ConflictException("Batch đích (id=" + target.getId() + ") đang FAILED — cần Thử lại/Hủy phiên đích trước");
        }

        // target APPROVED — RULE 9, PENDING_MOVE.
        ScanBatch supplement = creationService.resolveOrCreateSupplement(target.getId(), currentUser);
        ScanImage targetImage = scanImageRepository.save(ScanImage.builder()
                .scanBatch(supplement)
                .storagePath(image.getStoragePath())
                .clientImageId(image.getClientImageId() + ":move:" + supplement.getId())
                .status(ImageStatus.ACTIVE)
                .ocrCallLog(image.getOcrCallLog())
                .dateVerificationStatus(DateVerificationStatus.MATCHED)
                .ocrDetectedDate(targetDate)
                .effectiveWorkDate(targetDate)
                .uploadedBy(image.getUploadedBy())
                .build());

        if (sourceBatch.getDocumentType() == OcrTargetType.PRODUCTION_RECORD) {
            productionRecordService.copyDraftsForImage(image.getId(), targetImage, supplement, targetDate);
        } else {
            latexSaleService.copyDraftsForImage(image.getId(), targetImage, supplement, targetDate);
        }

        image.setStatus(ImageStatus.PENDING_MOVE);
        image.setPendingMoveTargetBatchId(supplement.getId());
        image.setDateResolution(DateResolution.CHANGE_DATE);
        scanImageRepository.save(image);

        closeDateMismatchConflict(imageId, currentUser, "CHANGE_DATE_PENDING_SUPPLEMENT");
        conflictService.open(sourceBatch, image, null, null, ConflictType.PENDING_MOVE, true,
                Map.of("targetSupplementBatchId", supplement.getId().toString()));
        auditLogService.log(sourceBatch, image, "IMAGE_MARKED_PENDING_MOVE", currentUser, false, null, null,
                sourceBatch.getId(), supplement.getId());

        recomputeService.recompute(sourceBatch.getId());
        recomputeService.recompute(supplement.getId());
        return buildResponse(sourceBatch.getId());
    }

    private void reparentImageAndRecords(ScanImage image, ScanBatch target, LocalDate newDate) {
        if (target.getDocumentType() == OcrTargetType.PRODUCTION_RECORD) {
            productionRecordService.reparentDraftsForImage(image.getId(), target, newDate);
        } else {
            latexSaleService.reparentDraftsForImage(image.getId(), target, newDate);
        }
        image.setScanBatch(target);
        image.setEffectiveWorkDate(newDate);
        scanImageRepository.save(image);
    }

    private void closeDateMismatchConflict(UUID imageId, User currentUser, String resolution) {
        conflictService.openForImage(imageId).stream()
                .filter(c -> c.getConflictType() == ConflictType.DATE_MISMATCH)
                .forEach(c -> conflictService.resolve(c, ConflictStatus.RESOLVED, resolution, currentUser));
    }

    // ============================================================= mục 6 — resolve conflict chung

    // Generic resolver cho UNKNOWN_EMPLOYEE/INVALID_BUSINESS_VALUE/POTENTIAL_DUPLICATE_OCR_ROW/
    // DUPLICATE_IMAGE (Spec 1 mục 6) — xem javadoc ResolveConflictRequest cho ý nghĩa từng action.
    public ScanBatchResponse resolveConflict(UUID conflictId, ResolveConflictRequest request, User currentUser) {
        ScanBatchConflict conflict = conflictService.getOrThrow(conflictId);
        if (conflict.getStatus() != ConflictStatus.OPEN) {
            throw new ConflictException("Conflict id=" + conflictId + " đã được xử lý trước đó (status=" + conflict.getStatus() + ")");
        }
        // getBatchOrThrow (không dùng thẳng conflict.getScanBatch()) — ScanBatchConflict.scanBatch là
        // quan hệ LAZY, method này không có @Transactional (cùng lý do đã ghi ở javadoc class), nên
        // proxy trả về từ conflict chưa init sẽ ném LazyInitializationException ngay khi đụng field bất
        // kỳ (kể cả cột enum thường như documentType, không riêng gì quan hệ) — vd cancelDraftsForImage
        // gọi batch.getDocumentType() bên dưới. getBatchOrThrow tự query lại bằng repository, không
        // phụ thuộc session còn mở hay không — phát hiện lỗi 500 khi resolve conflict "DISCARD" test
        // thật trên iPhone (2026-08-22).
        ScanBatch batch = getBatchOrThrow(conflict.getScanBatch().getId());

        switch (request.action()) {
            case "OVERRIDE" -> conflictService.resolve(conflict, ConflictStatus.OVERRIDDEN, "OVERRIDE", currentUser);
            case "DISCARD" -> {
                if (conflict.getScanImage() != null) {
                    cancelDraftsForImage(batch, conflict.getScanImage().getId(), currentUser);
                }
                conflictService.resolve(conflict, ConflictStatus.RESOLVED, "DISCARD", currentUser);
            }
            case "ASSIGN_EMPLOYEE" -> {
                if (conflict.getConflictType() != ConflictType.UNKNOWN_EMPLOYEE) {
                    throw new InvalidRequestException("ASSIGN_EMPLOYEE chỉ áp dụng cho conflict UNKNOWN_EMPLOYEE");
                }
                if (request.employeeId() == null) {
                    throw new InvalidRequestException("employeeId bắt buộc cho action=ASSIGN_EMPLOYEE");
                }
                OcrUnmatchedLine detail = readUnmatchedLineDetail(conflict.getDetail());
                ScanImage image = conflict.getScanImage();
                productionRecordService.createDraftFromOcr(image.getEffectiveWorkDate(), request.employeeId(),
                        detail.notes(), detail.items(), image.getOcrCallLog(), detail.lowConfidenceFields(), image,
                        detail.rowIndex(), currentUser);
                conflictService.resolve(conflict, ConflictStatus.RESOLVED, "ASSIGN_EMPLOYEE", currentUser);
            }
            default -> throw new InvalidRequestException("action không hợp lệ: " + request.action()
                    + " — chấp nhận OVERRIDE | DISCARD | ASSIGN_EMPLOYEE");
        }
        auditLogService.logByUser(batch, conflict.getScanImage(), "CONFLICT_" + request.action(), currentUser);
        recomputeService.recompute(batch.getId());
        return buildResponse(batch.getId());
    }

    private OcrUnmatchedLine readUnmatchedLineDetail(String json) {
        try {
            return objectMapper.readValue(json, OcrUnmatchedLine.class);
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được conflict detail (UNKNOWN_EMPLOYEE): " + json, e);
        }
    }

    // ============================================================= mục 1 — approve + move hoàn tất

    public ScanBatchResponse approve(UUID batchId, User currentUser) {
        ScanBatch batch = getBatchOrThrow(batchId);
        if (batch.getStatus() == BatchStatus.APPROVED) {
            throw new ConflictException("Batch id=" + batchId + " đã APPROVED trước đó");
        }
        // RULE 16 — CHỈ approve được khi đã recompute về đúng READY_TO_APPROVE. Trước đây chỉ check
        // "không terminal + không blocking conflict", để lọt batch đang UPLOADING/PROCESSING (ảnh mới
        // thêm chưa xử lý xong, CHƯA kịp phát sinh conflict row nào) vẫn approve được — phát hiện khi
        // viết integration test Case 24 (Spec 1 mục 9). conflictService.canApprove giữ lại làm
        // defense-in-depth (đề phòng batch.status lệch khỏi recompute do 1 code path nào đó quên gọi
        // recompute sau khi mở conflict).
        if (batch.getStatus() != BatchStatus.READY_TO_APPROVE || !conflictService.canApprove(batchId)) {
            throw new ConflictException("Chỉ xác nhận được batch đang READY_TO_APPROVE và không còn conflict "
                    + "blocking (hiện tại: " + batch.getStatus() + ") — RULE 6/15/16");
        }

        if (batch.getDocumentType() == OcrTargetType.PRODUCTION_RECORD) {
            productionRecordService.bulkApproveByScanBatch(batchId);
        } else {
            latexSaleService.bulkApproveByScanBatch(batchId);
        }

        batch.setStatus(BatchStatus.APPROVED);
        batch.setApprovedBy(currentUser);
        batch.setApprovedAt(Instant.now());
        scanBatchRepository.save(batch);
        auditLogService.logByUser(batch, null, "BATCH_APPROVED", currentUser);

        if (batch.getBatchType() == BatchType.SUPPLEMENT) {
            completeMoveForSupplement(batch, currentUser);
        }
        return buildResponse(batchId);
    }

    private void completeMoveForSupplement(ScanBatch supplement, User currentUser) {
        List<ScanImage> pendingImages = scanImageRepository.findByPendingMoveTargetBatchId(supplement.getId());
        Set<UUID> sourceBatchIds = new HashSet<>();
        for (ScanImage sourceImage : pendingImages) {
            ScanBatch sourceBatch = sourceImage.getScanBatch();
            sourceBatchIds.add(sourceBatch.getId());
            sourceImage.setStatus(ImageStatus.MOVED);
            sourceImage.setPendingMoveTargetBatchId(null);
            scanImageRepository.save(sourceImage);

            cancelDraftsForImage(sourceBatch, sourceImage.getId(), currentUser);

            conflictService.openForImage(sourceImage.getId()).stream()
                    .filter(c -> c.getConflictType() == ConflictType.PENDING_MOVE)
                    .forEach(c -> conflictService.resolve(c, ConflictStatus.RESOLVED, "MOVE_COMPLETED", currentUser));

            auditLogService.log(sourceBatch, sourceImage, "IMAGE_MOVED", currentUser, false, null, null,
                    sourceBatch.getId(), supplement.getId());
        }
        sourceBatchIds.forEach(recomputeService::recompute);
    }

    private void revertPendingMoveForRejectedSupplement(ScanBatch supplement, User currentUser) {
        List<ScanImage> pendingImages = scanImageRepository.findByPendingMoveTargetBatchId(supplement.getId());
        Set<UUID> sourceBatchIds = new HashSet<>();
        for (ScanImage sourceImage : pendingImages) {
            ScanBatch sourceBatch = sourceImage.getScanBatch();
            sourceBatchIds.add(sourceBatch.getId());
            sourceImage.setStatus(ImageStatus.ACTIVE);
            sourceImage.setPendingMoveTargetBatchId(null);
            // RULE 15 — khôi phục MISMATCH/UNRESOLVED, KHÔNG giữ resolution cũ, buộc user resolve lại.
            sourceImage.setDateVerificationStatus(DateVerificationStatus.MISMATCH);
            sourceImage.setDateResolution(DateResolution.UNRESOLVED);
            scanImageRepository.save(sourceImage);

            conflictService.openForImage(sourceImage.getId()).stream()
                    .filter(c -> c.getConflictType() == ConflictType.PENDING_MOVE)
                    .forEach(c -> conflictService.resolve(c, ConflictStatus.RESOLVED, "SUPPLEMENT_REJECTED", currentUser));
            // Mở LẠI 1 DATE_MISMATCH mới — không tái dùng row cũ đã RESOLVED (giữ audit append-only).
            conflictService.open(sourceBatch, sourceImage, null, null, ConflictType.DATE_MISMATCH, true,
                    Map.of("sessionWorkDate", sourceBatch.getWorkDate().toString(),
                            "ocrDetectedDate", String.valueOf(sourceImage.getOcrDetectedDate())));

            auditLogService.log(sourceBatch, sourceImage, "IMAGE_REVERTED_TO_ACTIVE", currentUser, false, null, null,
                    supplement.getId(), sourceBatch.getId());
        }
        sourceBatchIds.forEach(recomputeService::recompute);
    }

    private void cancelDraftsForImage(ScanBatch batch, UUID scanImageId, User currentUser) {
        if (batch.getDocumentType() == OcrTargetType.PRODUCTION_RECORD) {
            productionRecordService.cancelDraftsForImage(scanImageId, currentUser);
        } else {
            latexSaleService.cancelDraftsForImage(scanImageId, currentUser);
        }
    }

    // ============================================================= read + mapping

    public ScanBatchResponse get(UUID batchId) {
        return buildResponse(batchId);
    }

    /** Home "Chờ kiểm tra" (2026-08-25) — số batch đang chờ Admin thao tác tay (xem lại/sửa/duyệt, hoặc
     * Thử lại/Hủy nếu lỗi), xem BatchStatus.isPendingHumanAction(). */
    public long pendingReviewCount() {
        return scanBatchRepository.countByStatusIn(
                Arrays.stream(BatchStatus.values()).filter(BatchStatus::isPendingHumanAction).toList());
    }

    public List<ScanBatchAuditLogResponse> auditLog(UUID batchId) {
        return auditLogRepository.findByScanBatchIdOrderByPerformedAtAsc(batchId).stream()
                .map(a -> new ScanBatchAuditLogResponse(
                        a.getId(),
                        a.getScanImage() != null ? a.getScanImage().getId() : null,
                        a.getAction(),
                        a.isPerformedBySystem() ? "SYSTEM" : (a.getPerformedBy() != null ? a.getPerformedBy().getId().toString() : null),
                        a.getPerformedAt(), a.getOldValue(), a.getNewValue(), a.getSourceBatchId(), a.getTargetBatchId()))
                .toList();
    }

    private ScanBatch getBatchOrThrow(UUID batchId) {
        return scanBatchRepository.findByIdWithTeam(batchId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy scan_batch với id=" + batchId));
    }

    private ScanBatchResponse buildResponse(UUID batchId) {
        ScanBatch batch = getBatchOrThrow(batchId);
        List<ScanImageResponse> images = scanImageRepository.findByScanBatchId(batchId).stream()
                .map(this::toImageResponse)
                .toList();
        List<ScanBatchConflictResponse> conflicts = conflictService.forBatch(batchId).stream()
                .map(this::toConflictResponse)
                .sorted(Comparator.comparingInt(ScanBatchConflictResponse::displayOrder))
                .toList();
        boolean canApprove = batch.getStatus() == BatchStatus.READY_TO_APPROVE && conflictService.canApprove(batchId);
        return new ScanBatchResponse(
                batch.getId(), batch.getDocumentType().name(), batch.getWorkDate(),
                batch.getTeam().getId(), batch.getTeam().getName(),
                batch.getBatchType().name(),
                batch.getOriginalBatch() != null ? batch.getOriginalBatch().getId() : null,
                batch.getStatus().name(), canApprove,
                batch.getCreatedBy().getId(), batch.getCreatedAt(),
                batch.getApprovedBy() != null ? batch.getApprovedBy().getId() : null, batch.getApprovedAt(),
                images, conflicts);
    }

    private ScanImageResponse toImageResponse(ScanImage image) {
        // Ký URL tạm (bucket receipt-photos PRIVATE) — cùng lý do đã fix ở ProductionRecordService/
        // LatexSaleService.toResponse(): storagePath là object path tương đối, frontend không tải
        // thẳng được nếu không ký. toImageResponse() trước đây trả thẳng storagePath, khiến review
        // screen không hiển thị được ảnh dù batch xử lý OK — phát hiện khi test thật trên iPhone
        // (2026-08-22).
        String photoUrl = storageService.createSignedReadUrl(image.getStoragePath(), PHOTO_READ_URL_TTL_SECONDS);
        return new ScanImageResponse(
                image.getId(), image.getClientImageId(), photoUrl, image.getStatus().name(),
                image.getDateVerificationStatus() != null ? image.getDateVerificationStatus().name() : null,
                image.getDateResolution() != null ? image.getDateResolution().name() : null,
                image.getOcrDetectedDate(), image.getEffectiveWorkDate(),
                image.getPendingMoveTargetBatchId(), image.getErrorMessage(), image.getCreatedAt(),
                image.getOcrRowCount());
    }

    private ScanBatchConflictResponse toConflictResponse(ScanBatchConflict c) {
        return new ScanBatchConflictResponse(
                c.getId(), c.getScanImage() != null ? c.getScanImage().getId() : null,
                c.getRecordTable(), c.getRecordId(), c.getConflictType().name(), c.isBlocking(), c.getStatus().name(),
                c.getDetail(), conflictService.displayOrder(c.getConflictType()));
    }

    // ============================================================= helpers (copy/adapt từ OcrCaptureService)

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

    // Serialize an toàn cho các cột jsonb map String + @JdbcTypeCode(SqlTypes.JSON) (vd
    // ScanBatchAuditLog.oldValue/newValue) — các cột này nhận NGUYÊN VĂN string làm JSON, không tự
    // quote hộ như driver JDBC thường làm với text thường; truyền thẳng text thô (không qua hàm này)
    // sẽ khiến Postgres ném "invalid input syntax for type json" (xem ROW_SKIPPED_EMPTY_ITEMS).
    private String writeJsonOrNull(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không serialize được audit log value", e);
        }
    }

    private String guessMediaType(String objectPath) {
        String lower = objectPath.toLowerCase(Locale.ROOT);
        return lower.endsWith(".png") ? "image/png" : "image/jpeg";
    }

    private BigDecimal estimateCost(Integer inputTokens, Integer outputTokens) {
        if (inputTokens == null || outputTokens == null) {
            return null;
        }
        double[] pricing = PRICING_USD_PER_MTOK.get(anthropicProperties.model());
        if (pricing == null) {
            return null;
        }
        double cost = (inputTokens / 1_000_000.0) * pricing[0] + (outputTokens / 1_000_000.0) * pricing[1];
        return BigDecimal.valueOf(cost).setScale(6, RoundingMode.HALF_UP);
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng trên JVM này", e);
        }
    }
}
