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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 1 dòng / lần gọi Claude API (vision), bất kể thành công hay lỗi — theo dõi chi phí, thời gian phản
 * hồi, tỷ lệ thành công. Xem CLAUDE.md §4 và §5.
 */
@Entity
@Table(name = "ocr_call_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class OcrCallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "called_by", nullable = false)
    private User calledBy;

    @CreationTimestamp
    @Column(name = "called_at", nullable = false, updatable = false)
    private Instant calledAt;

    // Loại phiếu Admin ĐÃ CHỌN trước khi chụp/chọn ảnh (không phải loại thực tế đọc được)
    @Column(name = "target_type", nullable = false, length = 20)
    private OcrTargetType targetType;

    @Column(name = "photo_url", nullable = false)
    private String photoUrl;

    @Column(nullable = false, length = 50)
    private String model; // vd "claude-sonnet-5" — đổi theo thời gian, không hardcode logic theo giá trị này

    @Column(name = "duration_ms", nullable = false)
    private Integer durationMs;

    // Cuộc gọi API có lỗi kỹ thuật không (network/timeout/API error) — khác với type_mismatch bên dưới
    @Column(nullable = false)
    private boolean success;

    @Column(name = "error_message")
    private String errorMessage; // chỉ có giá trị khi success = false

    // Chỉ có ý nghĩa khi success = true; true = Claude xác định ảnh KHÔNG khớp targetType đã chọn
    // → không tạo draft, báo Admin chụp lại (xem CLAUDE.md §5)
    @Column(name = "type_mismatch", nullable = false)
    @Builder.Default
    private boolean typeMismatch = false;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "estimated_cost_usd", precision = 10, scale = 6)
    private BigDecimal estimatedCostUsd; // tính tại thời điểm gọi theo đơn giá model lúc đó
}
