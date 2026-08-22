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
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    // nullable, unique — set khi nhân viên đồng thời là 1 User (vd Tổ trưởng tự cạo mủ).
    // Xem CONTEXT.md "Tổ trưởng".
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    // enum ↔ VARCHAR qua EmployeeStatusConverter (autoApply)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    // Vợ/chồng cùng làm cạo mủ (CLAUDE.md §5, bổ sung 2026-08-16) — nullable, khai báo TRƯỚC qua
    // EmployeeService.update(), giữ đối xứng 2 chiều ở tầng service. FetchType.EAGER (khác team/user ở
    // trên) vì ScanBatchService.captureProductionRecordRows đọc field này NGOÀI transaction (cố ý —
    // captureImage/processOcr không @Transactional, xem javadoc ScanBatchService); self-join 1 nhân
    // viên, dữ liệu nhỏ, chi phí không đáng kể.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "spouse_employee_id")
    private Employee spouseEmployee;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
