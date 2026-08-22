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
 * Header: bán mủ theo TỔ cho người mua ngoài — khác luồng sản lượng cá nhân, không có employee_id
 * (chỉ ghi tên người ký seller_signed_by dạng text, vì đây là giao dịch cấp Tổ).
 */
@Entity
@Table(name = "latex_sales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class LatexSale {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "buyer_name", length = 150)
    private String buyerName;

    @Column(name = "seller_signed_by", length = 150)
    private String sellerSignedBy; // tên người đại diện Tổ xác nhận giao dịch

    private String notes;

    @Column(name = "photo_url")
    private String photoUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ocr_call_log_id")
    private OcrCallLog ocrCallLog; // nullable; set khi tạo qua OCR

    // Nullable — xem ghi chú tương ứng trong ProductionRecord (0021-scan-batch-model).
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

    // KHÔNG dùng @OrderBy("latexType.code") — Hibernate 6 lỗi PathResolutionException khi @OrderBy trỏ
    // qua property của 1 @ManyToOne association (fail ngay lúc build SessionFactory, không phải runtime).
    // Sắp xếp theo latexType.code ở tầng service/DTO khi đọc items nếu cần thứ tự hiển thị ổn định.
    @OneToMany(mappedBy = "latexSale", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LatexSaleItem> items = new ArrayList<>();

    public void addItem(LatexSaleItem item) {
        items.add(item);
        item.setLatexSale(this);
    }
}
