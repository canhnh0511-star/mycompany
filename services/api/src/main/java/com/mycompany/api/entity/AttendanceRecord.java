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
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Công/chuyên cần theo ngày — tách riêng khỏi ProductionRecord vì logic tính lương khác sản lượng.
 * Không có team_id riêng — suy ra qua employee.team (không có điều động tạm giữa các tổ).
 */
@Entity
@Table(name = "attendance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // enum ↔ VARCHAR qua AttendanceTypeConverter (autoApply). "lighting" cố ý không có ở đây.
    @Column(name = "attendance_type", nullable = false, length = 30)
    private AttendanceType attendanceType;

    @Column(nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE; // số ngày, hoặc tree section (medication)

    private String notes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // enum ↔ VARCHAR qua AttendanceRecordStatusConverter (autoApply). Tách riêng khỏi RecordStatus
    // (0021-scan-batch-model) — attendance không liên quan Scan Batch/production/latex-sale, giá trị
    // DB không đổi. Mặc định 'confirmed' — dữ liệu nhập tay không qua vòng OCR nên không cần draft
    // tạm; 'cancelled' dùng để "hủy" thay vì hard delete (migration 003).
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AttendanceRecordStatus status = AttendanceRecordStatus.CONFIRMED;
}
