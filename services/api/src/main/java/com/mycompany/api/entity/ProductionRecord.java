package com.mycompany.api.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
 * Header: sản lượng CÁ NHÂN theo ngày (1 dòng / nhân viên / ngày ACTIVE — xem partial unique index
 * uq_production_records_employee_date_active trong migration, KHÔNG thể hiện được ở JPA).
 * Khối lượng theo từng loại mủ nằm ở {@link ProductionRecordItem} — xem
 * docs/adr/0002-normalize-latex-type-storage.md.
 */
@Entity
@Table(name = "production_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ProductionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // Bản sao (denormalize) của employee.team tại thời điểm ghi — giữ đúng lịch sử nếu nhân viên đổi
    // tổ sau này. KHÔNG có điều động tạm giữa các tổ trong ngày (đã xác nhận trong buổi grilling).
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    private String notes;

    // enum ↔ VARCHAR qua RecordSourceConverter (autoApply)
    @Column(nullable = false, length = 20)
    private RecordSource source;

    @Column(name = "photo_url")
    private String photoUrl; // chỉ set khi source = OCR_IMPORT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ocr_call_log_id")
    private OcrCallLog ocrCallLog; // nullable; set khi source = OCR_IMPORT — trace về lần gọi OCR

    // Nullable — chỉ set khi record tạo qua luồng Scan Batch (0021-scan-batch-model); null cho
    // record source=manual và toàn bộ dữ liệu tạo trước migration 008 (không backfill, xem plan mục
    // Rủi ro). scanBatch denormalize từ scanImage.scanBatch, giống tiền lệ team denormalize từ
    // employee.team — tránh Sản lượng v2 phải join qua scan_images mỗi lần aggregate theo batch.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_image_id")
    private ScanImage scanImage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_batch_id")
    private ScanBatch scanBatch;

    // JSON thô (Jackson serialize ở service layer) — field nào OCR không chắc chắn, để frontend đọc
    // thẳng từ draft row mà highlight (CLAUDE.md §5), không phải state tạm ở client (ADR-0006).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "low_confidence_fields")
    private String lowConfidenceFields;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // enum ↔ VARCHAR qua RecordStatusConverter (autoApply)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RecordStatus status = RecordStatus.DRAFT;

    // Aggregate: sửa record luôn kèm sửa toàn bộ items — cascade ALL + orphanRemoval để service layer
    // chỉ cần thao tác trên list này, không tự quản lý vòng đời ProductionRecordItem riêng.
    // KHÔNG dùng @OrderBy("latexType.code") — Hibernate 6 lỗi PathResolutionException khi @OrderBy trỏ
    // qua property của 1 @ManyToOne association (fail ngay lúc build SessionFactory, không phải runtime).
    // Sắp xếp theo latexType.code ở tầng service/DTO khi đọc items nếu cần thứ tự hiển thị ổn định.
    @OneToMany(mappedBy = "productionRecord", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProductionRecordItem> items = new ArrayList<>();

    public void addItem(ProductionRecordItem item) {
        items.add(item);
        item.setProductionRecord(this);
    }
}
