package com.mycompany.api.service;

import com.mycompany.api.dto.OcrCallLogResponse;
import com.mycompany.api.dto.OcrCallLogStatsResponse;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.repository.OcrCallLogRepository;
import com.mycompany.api.repository.OcrStatsRaw;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đọc ocr_call_logs — theo dõi chi phí/thời gian phản hồi/tỷ lệ thành công (CLAUDE.md §4, docs/TASKS.md
 * Phase 4). Chỉ đọc — ghi log do OcrCaptureService (Phase 3) đảm nhiệm, không đụng ở đây.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OcrCallLogService {

    // Sentinel thay cho null trước khi truyền vào aggregateStats — xem ghi chú ở
    // OcrCallLogRepository.aggregateStats về lý do né pattern "(:x IS NULL OR ...)" cho cột timestamp.
    private static final Instant STATS_FROM_DEFAULT = Instant.EPOCH;
    private static final Instant STATS_TO_DEFAULT = Instant.parse("9999-12-31T23:59:59Z");

    private final OcrCallLogRepository ocrCallLogRepository;

    public Page<OcrCallLogResponse> list(
            OcrTargetType targetType, Boolean success, Instant from, Instant to, Pageable pageable) {
        Specification<OcrCallLog> spec = OcrCallLogSpecifications.withFilters(targetType, success, from, to);
        return ocrCallLogRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public OcrCallLogStatsResponse stats(Instant from, Instant to) {
        Instant effectiveFrom = from != null ? from : STATS_FROM_DEFAULT;
        Instant effectiveTo = to != null ? to : STATS_TO_DEFAULT;
        OcrStatsRaw raw = ocrCallLogRepository.aggregateStats(effectiveFrom, effectiveTo);
        double successRate = raw.totalCalls() == 0 ? 0.0 : (double) raw.successCount() / raw.totalCalls();
        double typeMismatchRate = raw.totalCalls() == 0 ? 0.0 : (double) raw.typeMismatchCount() / raw.totalCalls();
        BigDecimal totalCost = raw.totalCostUsd() == null ? BigDecimal.ZERO : raw.totalCostUsd();
        return new OcrCallLogStatsResponse(
                raw.totalCalls(), raw.successCount(), successRate,
                raw.typeMismatchCount(), typeMismatchRate, totalCost, raw.avgDurationMs());
    }

    private OcrCallLogResponse toResponse(OcrCallLog log) {
        return new OcrCallLogResponse(
                log.getId(),
                log.getCalledBy().getId(),
                log.getCalledBy().getFullName(),
                log.getCalledAt(),
                log.getTargetType().name(),
                log.getPhotoUrl(),
                log.getModel(),
                log.getDurationMs(),
                log.isSuccess(),
                log.getErrorMessage(),
                log.isTypeMismatch(),
                log.getInputTokens(),
                log.getOutputTokens(),
                log.getEstimatedCostUsd());
    }
}
