package com.mycompany.api.service;

import com.mycompany.api.entity.AttendanceRecord;
import com.mycompany.api.entity.AttendanceType;
import com.mycompany.api.entity.RecordStatus;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/**
 * Dựng {@link Specification} động cho GET list attendance-records (docs/TASKS.md Phase 4) — bỏ qua
 * filter null. Không có cột team_id riêng — lọc teamId phải join qua employee.team.id (CLAUDE.md §4).
 */
public final class AttendanceRecordSpecifications {

    private AttendanceRecordSpecifications() {
    }

    public static Specification<AttendanceRecord> withFilters(UUID teamId, UUID employeeId,
            LocalDate fromDate, LocalDate toDate, RecordStatus status, AttendanceType attendanceType) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teamId != null) {
                predicates.add(cb.equal(root.get("employee").get("team").get("id"), teamId));
            }
            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("recordDate"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("recordDate"), toDate));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (attendanceType != null) {
                predicates.add(cb.equal(root.get("attendanceType"), attendanceType));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
