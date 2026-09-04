package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * "Mủ tạp" (Module 3 — Bảng lương) — đơn giá GỘP cho mủ chén + mủ dây + mủ đông, time-versioned
 * (cùng cơ chế chống chồng lấn EXCLUDE như {@link RateConfig}) nhưng KHÔNG gắn latex_type_id nào.
 * Áp dụng CHỈ cho tính lương — không đổi cách Sản lượng/OCR lưu 3 loại mủ này riêng biệt (xem
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 2.1).
 */
@Entity
@Table(name = "payroll_mixed_latex_rate_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class PayrollMixedLatexRateConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice; // VND / kg, áp cho tổng kg (cup + strip + coagulated)

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo; // NULL = đang hiệu lực
}
