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
 * Danh mục phụ cấp/khấu trừ cho Module 3 (payroll) sau này, khai báo sẵn ở Module 1.
 * 'code' KHÔNG unique một mình — nhiều dòng theo thời gian cho cùng 1 code là hợp lệ (time-versioned,
 * cùng cơ chế chống chồng lấn EXCLUDE như RateConfig — xem migration).
 * Lưu ý: "lighting" (tiền đèn) là khoản cố định/tháng, không xuất hiện trong AttendanceType.
 */
@Entity
@Table(name = "allowance_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class AllowanceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 30)
    private String code; // storm_allowance | medication | attendance | lighting | tapping_work

    @Column(nullable = false, length = 100)
    private String name;

    // enum ↔ VARCHAR qua CalcTypeConverter (autoApply)
    @Column(name = "calc_type", nullable = false, length = 20)
    private CalcType calcType;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;
}
