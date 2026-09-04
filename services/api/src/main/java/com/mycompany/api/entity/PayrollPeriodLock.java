package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * "Chốt lương" (Module 3 — Bảng lương) — cờ đơn giản theo THÁNG, KHÔNG immutable (user xác nhận
 * dữ liệu vẫn sửa được sau khi chốt, đây chỉ là đánh dấu hiển thị) — vì vậy không cần state machine
 * như {@code BatchStatus.APPROVED}: có dòng cho {@code yearMonth} = "đã chốt", không có dòng =
 * "chưa chốt". "Mở chốt" = xóa dòng. Xem docs/specs/spec-3-bang-luong-v1-draft.md mục 2.4.
 */
@Entity
@Table(name = "payroll_period_locks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "yearMonth")
public class PayrollPeriodLock {

    @Id
    @Column(name = "year_month", length = 7)
    private String yearMonth; // 'YYYY-MM'

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "locked_by", nullable = false)
    private User lockedBy;

    @CreationTimestamp
    @Column(name = "locked_at", nullable = false, updatable = false)
    private Instant lockedAt;
}
