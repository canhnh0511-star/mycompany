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

/**
 * Override "Trừ / Tạm ứng" riêng cho 1 nhân viên/1 tháng (Module 3 — Bảng lương) — CHỈ có dòng khi
 * Admin chủ động sửa khác mặc định hệ thống ({@link PayrollSetting} key
 * {@code default_monthly_advance}). Không có dòng cho (employeeId, yearMonth) → dùng mặc định. Xem
 * docs/specs/spec-3-bang-luong-v1-draft.md mục 2.6.
 */
@Entity
@Table(name = "payroll_deductions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class PayrollDeduction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth; // 'YYYY-MM'

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
