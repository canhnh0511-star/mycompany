package com.mycompany.api.entity;

/**
 * PRIMARY = phiên quét gốc cho 1 LogicalBatchKey (documentType+workDate+teamId).
 * SUPPLEMENT = bổ sung sau khi PRIMARY đã APPROVED (originalBatch trỏ về PRIMARY đó) — xem
 * 0021-scan-batch-model, Spec 1 mục 3/3.2.
 */
public enum BatchType {
    PRIMARY,
    SUPPLEMENT
}
