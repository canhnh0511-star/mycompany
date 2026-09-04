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
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 1 ảnh chụp/upload trong 1 ScanBatch — first-class, thay cho photo_url string rời rạc trên từng
 * production_records/latex_sales row trước đây (0021-scan-batch-model). clientImageId sinh ở
 * client, dùng dedup retry-upload (RULE 4); ocrRunId đổi mỗi lần retry OCR (RULE 5); replacesImage
 * trỏ ảnh cũ khi chụp lại (RULE 6 — ảnh cũ chuyển REPLACED, không xóa vật lý).
 * pendingMoveTargetBatchId set khi status=PENDING_MOVE, trỏ Supplement batch đích (Spec 1 mục 5).
 */
@Entity
@Table(name = "scan_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ScanImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scan_batch_id", nullable = false)
    private ScanBatch scanBatch;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    // Sinh client-side (uuid), UNIQUE — dedup khi client retry upload cùng 1 ảnh (RULE 4).
    @Column(name = "client_image_id", nullable = false, length = 100)
    private String clientImageId;

    // SHA-256 sau khi backend download ảnh — dùng phát hiện DUPLICATE_IMAGE conflict.
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(nullable = false, length = 20)
    private ImageStatus status;

    // Đổi mỗi lần retry OCR — dùng dedup/replace OCR run cũ (RULE 5), KHÔNG tạo duplicate row.
    @Column(name = "ocr_run_id")
    private UUID ocrRunId;

    // Lần gọi OCR mới nhất; lịch sử các lần cũ vẫn còn nguyên trong ocr_call_logs (không xóa).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ocr_call_log_id")
    private OcrCallLog ocrCallLog;

    @Column(name = "date_verification_status", length = 20)
    private DateVerificationStatus dateVerificationStatus;

    @Column(name = "date_resolution", length = 20)
    private DateResolution dateResolution;

    @Column(name = "ocr_detected_date")
    private LocalDate ocrDetectedDate;

    // Ngày thực sự dùng để ghi record_date — sessionWorkDate hoặc ocrDetectedDate tùy resolution.
    @Column(name = "effective_work_date")
    private LocalDate effectiveWorkDate;

    // Số dòng OCR đọc được (input.rows.size() lúc xử lý) — KHÔNG suy ngược từ số record/conflict đã
    // tạo (1 dòng vợ/chồng → 2 record, 1 dòng lỗi số liệu vẫn tạo record + conflict riêng). Dùng để
    // Admin đối chiếu bằng mắt với số dòng thật trên phiếu giấy (migration 011).
    @Column(name = "ocr_row_count")
    private Integer ocrRowCount;

    // Set khi status=PENDING_MOVE, trỏ Supplement batch đích (Spec 1 mục 5/5.1). Không map @ManyToOne
    // trực tiếp sang ScanBatch — chỉ cần id để tránh vòng lặp lazy-load 2 chiều không cần thiết.
    @Column(name = "pending_move_target_batch_id")
    private UUID pendingMoveTargetBatchId;

    // Ảnh chụp lại trỏ về ảnh cũ (RULE 6) — ảnh cũ chuyển status=REPLACED, không xóa vật lý.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replaces_image_id")
    private ScanImage replacesImage;

    @Column(name = "error_message")
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
