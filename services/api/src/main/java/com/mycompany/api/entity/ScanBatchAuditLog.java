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
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Action-log cho vòng đời ScanBatch/ScanImage (Spec 1 mục 7) — KHÔNG tái dùng EditHistory (thiết kế
 * cho snapshot diff record-level polymorphic, khác mục đích action-log nhiều-sự-kiện-nhỏ).
 * performedBySystem=true cho resolution tự động (vd FALLBACK_SESSION_DATE khi NOT_DETECTED) — spec
 * gốc ghi performedBy="SYSTEM" dạng literal, nhưng ở đây giữ performedBy là FK thật (null khi
 * system) + cờ riêng để không phá referential integrity; DTO response render "SYSTEM" khi cờ này
 * true (deviation có chủ đích, xem plan mục kiến trúc).
 */
@Entity
@Table(name = "scan_batch_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ScanBatchAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scan_batch_id", nullable = false)
    private ScanBatch scanBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_image_id")
    private ScanImage scanImage;

    // Vd: BATCH_MARKED_FAILED, BATCH_CANCELLED, BATCH_APPROVED, IMAGE_MARKED_PENDING_MOVE,
    // IMAGE_MOVED, IMAGE_REVERTED_TO_ACTIVE, DATE_RESOLVED_KEEP/CHANGE, SUPPLEMENT_CREATED,
    // SUPPLEMENT_REUSED, CONFLICT_RESOLVED, CONFLICT_OVERRIDDEN — text tự do, không enum hóa (danh
    // sách action còn mở, xem Spec 1 mục 7).
    @Column(nullable = false, length = 50)
    private String action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    @Column(name = "performed_by_system", nullable = false)
    @Builder.Default
    private boolean performedBySystem = false;

    @CreationTimestamp
    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_value")
    private String oldValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value")
    private String newValue;

    // Cho action span 2 batch (move/supplement) — chỉ lưu id, không map quan hệ để tránh phụ thuộc
    // 2 chiều không cần thiết.
    @Column(name = "source_batch_id")
    private UUID sourceBatchId;

    @Column(name = "target_batch_id")
    private UUID targetBatchId;
}
