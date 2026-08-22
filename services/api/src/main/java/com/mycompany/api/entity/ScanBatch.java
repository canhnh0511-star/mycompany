package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 1 "phiên quét" cho 1 LogicalBatchKey (documentType + workDate + teamId) — 0021-scan-batch-model,
 * Spec 1. batchType=PRIMARY là bản gốc cho key đó; batchType=SUPPLEMENT là bổ sung sau khi PRIMARY
 * đã APPROVED (originalBatch trỏ về PRIMARY đó — Spec 1 mục 3.2).
 *
 * DB uniqueness (KHÔNG theo uniquenessScope runtime — xem Spec 1 mục 3.1):
 *   uq_scan_batches_primary_key: UNIQUE(document_type, work_date, team_id)
 *     WHERE batch_type='primary' AND status&lt;&gt;'cancelled' — APPROVED vẫn nằm trong index, chặn
 *     vĩnh viễn PRIMARY thứ 2 cho cùng key.
 *   uq_scan_batches_supplement_active: UNIQUE(original_batch_id)
 *     WHERE batch_type='supplement' AND status IN (...ACTIVE_SUPPLEMENT_STATUSES...).
 */
@Entity
@Table(name = "scan_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ScanBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Phần 1 của LogicalBatchKey — loại phiếu Admin đã chọn trước khi chụp (tái dùng OcrTargetType).
    @Column(name = "document_type", nullable = false, length = 20)
    private OcrTargetType documentType;

    // Phần 2 của LogicalBatchKey — sessionWorkDate (RULE 1: nguồn ngày làm việc chính).
    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    // Phần 3 của LogicalBatchKey.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "batch_type", nullable = false, length = 20)
    private BatchType batchType;

    // Chỉ set khi batchType=SUPPLEMENT, trỏ về PRIMARY đã APPROVED (Spec 1 mục 3.2).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_batch_id")
    private ScanBatch originalBatch;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private BatchStatus status = BatchStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;
}
