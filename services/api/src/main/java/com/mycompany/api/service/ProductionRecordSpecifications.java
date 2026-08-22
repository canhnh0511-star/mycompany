package com.mycompany.api.service;

import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordStatus;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Dựng {@link Specification} động cho GET list production-records (docs/TASKS.md Phase 4) — bỏ qua filter null. */
public final class ProductionRecordSpecifications {

    private ProductionRecordSpecifications() {
    }

    public static Specification<ProductionRecord> withFilters(
            UUID teamId, UUID employeeId, LocalDate fromDate, LocalDate toDate, RecordStatus status) {
        return withFilters(teamId, employeeId, fromDate, toDate, status, null);
    }

    // scanBatchId — 0021-scan-batch-model, dùng cho màn review 1 phiên quét cụ thể (draft record nào
    // thuộc batch này). Overload riêng thay vì thêm tham số vào chữ ký cũ để không phá các call site
    // hiện có (report/list thông thường không cần lọc theo batch).
    public static Specification<ProductionRecord> withFilters(
            UUID teamId, UUID employeeId, LocalDate fromDate, LocalDate toDate, RecordStatus status, UUID scanBatchId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teamId != null) {
                predicates.add(cb.equal(root.get("team").get("id"), teamId));
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
            if (scanBatchId != null) {
                predicates.add(cb.equal(root.get("scanBatch").get("id"), scanBatchId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
