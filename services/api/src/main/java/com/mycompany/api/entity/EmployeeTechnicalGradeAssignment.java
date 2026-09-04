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

/**
 * Hạng kỹ thuật (A/B/C) của 1 nhân viên — XÉT LẠI THEO TỪNG THÁNG (KHÔNG phải thuộc tính cố định
 * của {@link Employee}, sửa lại sau khi implement sai lần đầu — Module 3, docs/specs/spec-3-bang-luong-v1-draft.md
 * mục 2.2). Không có dòng cho (employeeId, yearMonth) → tháng đó nhân viên không có phụ cấp này
 * (không phải lỗi dữ liệu). Cùng pattern với {@link PayrollDeduction}.
 */
@Entity
@Table(name = "employee_technical_grade_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class EmployeeTechnicalGradeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth; // 'YYYY-MM'

    // enum ↔ VARCHAR qua TechnicalGradeConverter (autoApply)
    @Column(nullable = false, length = 1)
    private TechnicalGrade grade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
