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
 * Đơn giá "Hạng kỹ thuật" (Module 3 — Bảng lương) theo hạng A/B/C, time-versioned (cùng cơ chế
 * chống chồng lấn EXCLUDE theo (grade, effective_from/to) như {@link AllowanceConfig}). CỐ ĐỊNH/
 * tháng theo hạng — KHÔNG nhân số lượng gì, khác hẳn calc_type. Xem
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 2.2 + {@link Employee#getTechnicalGrade()}.
 */
@Entity
@Table(name = "technical_grade_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class TechnicalGradeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // enum ↔ VARCHAR qua TechnicalGradeConverter (autoApply)
    @Column(nullable = false, length = 1)
    private TechnicalGrade grade;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice; // VND / tháng

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;
}
