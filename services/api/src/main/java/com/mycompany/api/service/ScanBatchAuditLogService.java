package com.mycompany.api.service;

import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanBatchAuditLog;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.ScanBatchAuditLogRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Action-log cho vòng đời ScanBatch/ScanImage (Spec 1 mục 7) — KHÔNG tái dùng edit_history (xem
 * ADR-0021). performedBySystem=true cho resolution tự động (vd FALLBACK_SESSION_DATE khi
 * NOT_DETECTED) — giữ performedBy=null trong DB, DTO render "SYSTEM" khi build response.
 */
@Service
@RequiredArgsConstructor
public class ScanBatchAuditLogService {

    private final ScanBatchAuditLogRepository auditLogRepository;

    public void logByUser(ScanBatch batch, ScanImage image, String action, User performedBy) {
        log(batch, image, action, performedBy, false, null, null, null, null);
    }

    public void logBySystem(ScanBatch batch, ScanImage image, String action) {
        log(batch, image, action, null, true, null, null, null, null);
    }

    public void logSpanningBatches(String action, User performedBy, UUID sourceBatchId, UUID targetBatchId) {
        log(null, null, action, performedBy, false, null, null, sourceBatchId, targetBatchId);
    }

    public void log(ScanBatch batch, ScanImage image, String action, User performedBy, boolean system,
            String oldValue, String newValue, UUID sourceBatchId, UUID targetBatchId) {
        auditLogRepository.save(ScanBatchAuditLog.builder()
                .scanBatch(batch != null ? batch : image.getScanBatch())
                .scanImage(image)
                .action(action)
                .performedBy(system ? null : performedBy)
                .performedBySystem(system)
                .oldValue(oldValue)
                .newValue(newValue)
                .sourceBatchId(sourceBatchId)
                .targetBatchId(targetBatchId)
                .build());
    }
}
