package com.mycompany.api.controller;

import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.CreateProductionRecordRequest;
import com.mycompany.api.dto.ProductionRecordResponse;
import com.mycompany.api.dto.UpdateProductionRecordRequest;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.ProductionRecordService;
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
@RequestMapping("/api/v1/production-records")
@RequiredArgsConstructor
public class ProductionRecordController {

    private final ProductionRecordService productionRecordService;

    // KHÔNG @Valid ở đây — validate thủ công từng dòng trong service (BatchRowValidator) để giữ
    // đúng best-effort theo từng dòng (ADR-0007); @Valid trên List sẽ chặn toàn bộ request khi có
    // 1 dòng lỗi binding.
    @PostMapping("/batch")
    public BatchResult<ProductionRecordResponse> createBatch(
            @RequestBody List<CreateProductionRecordRequest> requests,
            @AuthenticationPrincipal User currentUser) {
        return productionRecordService.createBatch(requests, currentUser);
    }

    @GetMapping("/{id}")
    public ProductionRecordResponse get(@PathVariable UUID id) {
        return productionRecordService.get(id);
    }

    // Tab "Tra cứu" (CLAUDE.md §5) — mặc định trả cả draft chưa confirm khi không lọc status.
    @GetMapping
    public Page<ProductionRecordResponse> list(
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) RecordStatus status,
            @PageableDefault(size = 50, sort = "recordDate", direction = Direction.DESC) Pageable pageable) {
        return productionRecordService.list(teamId, employeeId, fromDate, toDate, status, pageable);
    }

    @PatchMapping("/{id}")
    public ProductionRecordResponse update(@PathVariable UUID id,
            @Valid @RequestBody UpdateProductionRecordRequest request,
            @AuthenticationPrincipal User currentUser) {
        return productionRecordService.update(id, request, currentUser);
    }

    // "Xóa" = chuyển status → cancelled, không hard delete (CLAUDE.md §4).
    @PostMapping("/{id}/cancel")
    public ProductionRecordResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return productionRecordService.cancel(id, currentUser);
    }

    // draft → confirmed (ADR-0006) — chỉ áp dụng cho record tạo qua luồng OCR (Phase 3).
    @PostMapping("/{id}/confirm")
    public ProductionRecordResponse confirm(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return productionRecordService.confirm(id, currentUser);
    }
}
