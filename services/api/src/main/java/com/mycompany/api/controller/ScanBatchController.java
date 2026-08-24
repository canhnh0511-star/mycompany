package com.mycompany.api.controller;

import com.mycompany.api.dto.CaptureImageRequest;
import com.mycompany.api.dto.ResolveConflictRequest;
import com.mycompany.api.dto.ResolveDateRequest;
import com.mycompany.api.dto.ScanBatchAuditLogResponse;
import com.mycompany.api.dto.ScanBatchLookupResponse;
import com.mycompany.api.dto.ScanBatchResponse;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.ScanBatchService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Scan Session/Batch (0021-scan-batch-model, Spec 1) — thay thế POST /api/v1/ocr/capture cũ.
 * /upload-url (OcrController) giữ nguyên, không đổi — chỉ ký URL Supabase, không liên quan state
 * machine.
 */
@RestController
@RequestMapping("/api/v1/scan-batches")
@RequiredArgsConstructor
public class ScanBatchController {

    private final ScanBatchService scanBatchService;

    // Frontend gọi TRƯỚC khi mở camera — biết ngay có batch FAILED/APPROVED đang giữ key này
    // không, để hiện banner tương ứng thay vì để user chụp rồi mới nhận 409 (Spec 1 mục 1).
    @GetMapping("/lookup")
    public ScanBatchLookupResponse lookup(
            @RequestParam OcrTargetType documentType, @RequestParam UUID teamId, @RequestParam LocalDate workDate) {
        return scanBatchService.lookup(documentType, teamId, workDate);
    }

    // 1 request/1 ảnh, đồng bộ (ADR-0005 vẫn giữ nguyên tinh thần) — tạo/merge batch, OCR, verify
    // ngày, detect conflict, tạo draft record, recompute batch status; trả về TOÀN BỘ batch (không
    // chỉ ảnh vừa xử lý) để frontend render lại review table đầy đủ.
    @PostMapping("/images")
    public ScanBatchResponse captureImage(@Valid @RequestBody CaptureImageRequest request, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.captureImage(request, currentUser);
    }

    @GetMapping("/{id}")
    public ScanBatchResponse get(@PathVariable UUID id) {
        return scanBatchService.get(id);
    }

    @PostMapping("/images/{imageId}/retry")
    public ScanBatchResponse retryImage(@PathVariable UUID imageId, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.retryImage(imageId, currentUser);
    }

    // Xóa (soft) 1 ảnh chụp/chọn nhầm khỏi batch — chỉ áp dụng ảnh FAILED (xem javadoc removeImage).
    @PostMapping("/images/{imageId}/remove")
    public ScanBatchResponse removeImage(@PathVariable UUID imageId, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.removeImage(imageId, currentUser);
    }

    // Batch-level "Thử lại" trên banner FAILED (Spec 1 mục 1) — retry mọi ảnh FAILED trong batch.
    @PostMapping("/{id}/retry")
    public ScanBatchResponse retryBatch(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.retryBatch(id, currentUser);
    }

    // "Hủy phiên này" trên banner FAILED, hoặc reject 1 Supplement đang review (Spec 1 mục 5).
    @PostMapping("/{id}/cancel")
    public ScanBatchResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.cancelBatch(id, currentUser);
    }

    @PostMapping("/images/{imageId}/resolve-date")
    public ScanBatchResponse resolveDate(@PathVariable UUID imageId,
            @Valid @RequestBody ResolveDateRequest request, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.resolveDate(imageId, request, currentUser);
    }

    // Theo conflictId (không phải imageId) — 1 ảnh có thể có nhiều conflict cùng lúc.
    @PostMapping("/conflicts/{conflictId}/resolve")
    public ScanBatchResponse resolveConflict(@PathVariable UUID conflictId,
            @Valid @RequestBody ResolveConflictRequest request, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.resolveConflict(conflictId, request, currentUser);
    }

    // Gọi SAU khi Admin sửa xong 1 dòng record thuộc ảnh đang có TOTAL_MISMATCH open — khớp lại thì tự
    // đóng cảnh báo, còn lệch thì cập nhật số lệch mới nhất (xem javadoc ScanBatchService).
    @PostMapping("/conflicts/{conflictId}/recheck-total")
    public ScanBatchResponse recheckTotal(@PathVariable UUID conflictId, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.recheckTotalMismatch(conflictId, currentUser);
    }

    @PostMapping("/{id}/approve")
    public ScanBatchResponse approve(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return scanBatchService.approve(id, currentUser);
    }

    @GetMapping("/{id}/audit-log")
    public List<ScanBatchAuditLogResponse> auditLog(@PathVariable UUID id) {
        return scanBatchService.auditLog(id);
    }
}
