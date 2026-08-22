package com.mycompany.api.controller;

import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.CreateLatexSaleRequest;
import com.mycompany.api.dto.LatexSaleResponse;
import com.mycompany.api.dto.UpdateLatexSaleRequest;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.LatexSaleService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/latex-sales")
@RequiredArgsConstructor
public class LatexSaleController {

    private final LatexSaleService latexSaleService;

    // KHÔNG @Valid ở đây — xem ghi chú tương ứng trong ProductionRecordController.
    @PostMapping("/batch")
    public BatchResult<LatexSaleResponse> createBatch(
            @RequestBody List<CreateLatexSaleRequest> requests,
            @AuthenticationPrincipal User currentUser) {
        return latexSaleService.createBatch(requests, currentUser);
    }

    @GetMapping("/{id}")
    public LatexSaleResponse get(@PathVariable UUID id) {
        return latexSaleService.get(id);
    }

    // Tab "Tra cứu" (CLAUDE.md §5) — mặc định trả cả draft chưa confirm khi không lọc status.
    @GetMapping
    public Page<LatexSaleResponse> list(
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) RecordStatus status,
            @PageableDefault(size = 50, sort = "recordDate", direction = Direction.DESC) Pageable pageable) {
        return latexSaleService.list(teamId, fromDate, toDate, status, pageable);
    }

    @PatchMapping("/{id}")
    public LatexSaleResponse update(@PathVariable UUID id,
            @Valid @RequestBody UpdateLatexSaleRequest request,
            @AuthenticationPrincipal User currentUser) {
        return latexSaleService.update(id, request, currentUser);
    }

    // "Xóa" = chuyển status → cancelled, không hard delete (CLAUDE.md §4).
    @PostMapping("/{id}/cancel")
    public LatexSaleResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return latexSaleService.cancel(id, currentUser);
    }

    // draft → approved (ADR-0006, đổi tên endpoint từ /confirm ở 0021-scan-batch-model) — chỉ áp dụng
    // cho record tạo qua luồng OCR.
    @PostMapping("/{id}/approve")
    public LatexSaleResponse approve(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return latexSaleService.approve(id, currentUser);
    }
}
