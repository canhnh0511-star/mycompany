package com.mycompany.api.controller;

import com.mycompany.api.dto.OcrCallLogResponse;
import com.mycompany.api.dto.OcrCallLogStatsResponse;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.service.OcrCallLogService;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Đọc ocr_call_logs — theo dõi chi phí/tỷ lệ thành công OCR (CLAUDE.md §4, docs/TASKS.md Phase 4). */
@RestController
@RequestMapping("/api/v1/ocr-call-logs")
@RequiredArgsConstructor
public class OcrCallLogController {

    private final OcrCallLogService ocrCallLogService;

    @GetMapping
    public Page<OcrCallLogResponse> list(
            @RequestParam(required = false) OcrTargetType targetType,
            @RequestParam(required = false) Boolean success,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 50, sort = "calledAt", direction = Direction.DESC) Pageable pageable) {
        return ocrCallLogService.list(targetType, success, from, to, pageable);
    }

    @GetMapping("/stats")
    public OcrCallLogStatsResponse stats(
            @RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to) {
        return ocrCallLogService.stats(from, to);
    }
}
