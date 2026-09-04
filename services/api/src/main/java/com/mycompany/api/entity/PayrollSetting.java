package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Cấu hình mặc định hệ thống cho payroll, key-value đơn giản (Module 3 — Bảng lương) — hiện chỉ có
 * 1 key {@code default_monthly_advance} (mức tạm ứng mặc định/tháng, seed 1.000.000đ ở migration
 * 011), tái dùng được cho setting khác sau này nếu cần. Override theo từng nhân viên/tháng nằm ở
 * {@link PayrollDeduction} riêng — sửa 1 dòng KHÔNG đụng bảng này. Xem
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 2.6.
 */
@Entity
@Table(name = "payroll_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "key")
public class PayrollSetting {

    @Id
    @Column(length = 50)
    private String key;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal value;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
