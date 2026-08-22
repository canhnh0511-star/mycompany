-- =====================================================================
-- Scan Session/Batch rework (Spec 1, 0021-scan-batch-model) — nền tảng cho luồng quét ảnh hằng
-- ngày mới: ScanBatch (1 "phiên quét" cho 1 LogicalBatchKey = document_type+work_date+team_id) +
-- ScanImage (1 ảnh, first-class thay cho photo_url string rời rạc) + ScanBatchConflict (ledger
-- blocking conflict, nguồn tính canApprove) + ScanBatchAuditLog (action-log, tách khỏi edit_history
-- vì khác mục đích — xem docs/adr/0021-scan-batch-model.md).
-- =====================================================================

CREATE TABLE scan_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type       VARCHAR(20) NOT NULL CHECK (document_type IN ('production_record', 'latex_sale')),
    work_date           DATE NOT NULL,
    team_id             UUID NOT NULL REFERENCES teams(id),
    batch_type          VARCHAR(20) NOT NULL CHECK (batch_type IN ('primary', 'supplement')),
    original_batch_id   UUID REFERENCES scan_batches(id), -- chỉ set khi batch_type='supplement'
    status              VARCHAR(20) NOT NULL CHECK (status IN
        ('draft', 'uploading', 'processing', 'need_review', 'ready_to_approve', 'partial_failed',
         'failed', 'approved', 'cancelled')),
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ
);

-- PRIMARY: tối đa 1 batch chưa CANCELLED cho mỗi LogicalBatchKey — APPROVED vẫn nằm trong index
-- (chặn vĩnh viễn PRIMARY thứ 2), CHỈ CANCELLED mới ra khỏi index. Đây là điều kiện DB uniqueness
-- THỰC TẾ, khác uniquenessScope runtime (ACTIVE/MERGEABLE ∪ {FAILED}) dùng cho logic UI/merge —
-- xem Spec 1 mục 3.1, docs/adr/0021-scan-batch-model.md.
CREATE UNIQUE INDEX uq_scan_batches_primary_key
    ON scan_batches (document_type, work_date, team_id)
    WHERE batch_type = 'primary' AND status <> 'cancelled';

-- SUPPLEMENT: tối đa 1 Supplement đang active cho mỗi PRIMARY đã approved (Spec 1 mục 3.2) — 1
-- PRIMARY có thể có NHIỀU supplement lịch sử (đã approved/cancelled), nhưng chỉ 1 cái active cùng
-- lúc.
CREATE UNIQUE INDEX uq_scan_batches_supplement_active
    ON scan_batches (original_batch_id)
    WHERE batch_type = 'supplement'
      AND status IN ('draft', 'uploading', 'processing', 'need_review', 'ready_to_approve',
                      'partial_failed', 'failed');

CREATE INDEX idx_scan_batches_original ON scan_batches(original_batch_id);
CREATE INDEX idx_scan_batches_team_date ON scan_batches(team_id, work_date);

CREATE TABLE scan_images (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_batch_id                   UUID NOT NULL REFERENCES scan_batches(id),
    storage_path                    TEXT NOT NULL,
    client_image_id                 VARCHAR(100) NOT NULL, -- sinh client-side, dedup retry-upload (RULE 4)
    content_hash                    VARCHAR(64),            -- SHA-256, phát hiện DUPLICATE_IMAGE
    status                          VARCHAR(20) NOT NULL CHECK (status IN
        ('uploading', 'processing', 'active', 'failed', 'pending_move', 'moved', 'replaced')),
    ocr_run_id                      UUID,                    -- đổi mỗi lần retry OCR (RULE 5)
    ocr_call_log_id                 UUID REFERENCES ocr_call_logs(id),
    date_verification_status        VARCHAR(20) CHECK (date_verification_status IN
        ('matched', 'not_detected', 'mismatch')),
    date_resolution                 VARCHAR(20) CHECK (date_resolution IN
        ('fallback_session_date', 'keep_session_date', 'change_date', 'unresolved')),
    ocr_detected_date                DATE,
    effective_work_date              DATE,
    pending_move_target_batch_id     UUID REFERENCES scan_batches(id),
    replaces_image_id                UUID REFERENCES scan_images(id), -- ảnh chụp lại trỏ ảnh cũ (RULE 6)
    error_message                    TEXT,
    uploaded_by                      UUID NOT NULL REFERENCES users(id),
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_image_id)
);
CREATE INDEX idx_scan_images_batch ON scan_images(scan_batch_id);
CREATE INDEX idx_scan_images_pending_move_target ON scan_images(pending_move_target_batch_id);

CREATE TABLE scan_batch_conflicts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_batch_id     UUID NOT NULL REFERENCES scan_batches(id),
    scan_image_id     UUID REFERENCES scan_images(id),
    record_table      VARCHAR(50), -- 'production_records' | 'latex_sales' — polymorphic như edit_history
    record_id         UUID,
    conflict_type     VARCHAR(30) NOT NULL CHECK (conflict_type IN
        ('duplicate_image', 'image_quality_or_ocr_failed', 'date_mismatch', 'unknown_employee',
         'invalid_business_value', 'potential_duplicate_ocr_row', 'pending_move', 'other')),
    blocking          BOOLEAN NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'overridden')),
    detail            JSONB,
    resolved_by       UUID REFERENCES users(id),
    resolved_at       TIMESTAMPTZ,
    resolution        VARCHAR(50),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- canApprove (Spec 1 mục 6/RULE 6,15) = NOT EXISTS conflict WHERE blocking=true AND status='open' —
-- partial index tối ưu đúng query này.
CREATE INDEX idx_conflicts_batch_open ON scan_batch_conflicts(scan_batch_id) WHERE status = 'open';

CREATE TABLE scan_batch_audit_log (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_batch_id         UUID NOT NULL REFERENCES scan_batches(id),
    scan_image_id         UUID REFERENCES scan_images(id),
    action                VARCHAR(50) NOT NULL,
    performed_by          UUID REFERENCES users(id), -- NULL khi performed_by_system=true
    performed_by_system   BOOLEAN NOT NULL DEFAULT false,
    performed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_value             JSONB,
    new_value             JSONB,
    source_batch_id       UUID REFERENCES scan_batches(id),
    target_batch_id       UUID REFERENCES scan_batches(id)
);
CREATE INDEX idx_audit_log_batch ON scan_batch_audit_log(scan_batch_id);
