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
 * Ledger chuẩn hóa cho toàn bộ bảng "blocking conflict" (Spec 1 mục 6) — vừa là nguồn tính
 * canApprove (NOT EXISTS conflict WHERE blocking=true AND status='open'), vừa nguồn hiển thị UI
 * theo thứ tự ưu tiên (displayOrder tính tĩnh phía Java từ conflictType, không lưu DB).
 * scanImage set khi conflict scope=ảnh (DUPLICATE_IMAGE/IMAGE_QUALITY_OR_OCR_FAILED/DATE_MISMATCH/
 * PENDING_MOVE); recordTable+recordId (polymorphic như EditHistory) set khi scope=dòng
 * (UNKNOWN_EMPLOYEE/INVALID_BUSINESS_VALUE/POTENTIAL_DUPLICATE_OCR_ROW); cả 2 null khi batch-level
 * (OTHER).
 */
@Entity
@Table(name = "scan_batch_conflicts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ScanBatchConflict {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scan_batch_id", nullable = false)
    private ScanBatch scanBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_image_id")
    private ScanImage scanImage;

    // 'production_records' | 'latex_sales' — polymorphic, cùng quy ước EditHistory.tableName.
    @Column(name = "record_table", length = 50)
    private String recordTable;

    @Column(name = "record_id")
    private UUID recordId;

    @Column(name = "conflict_type", nullable = false, length = 30)
    private ConflictType conflictType;

    @Column(nullable = false)
    private boolean blocking;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConflictStatus status = ConflictStatus.OPEN;

    // Chi tiết cụ thể (vd tên nhân viên không match, giá trị invalid) — JSON thô, service serialize.
    @JdbcTypeCode(SqlTypes.JSON)
    private String detail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(length = 50)
    private String resolution;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
