package com.mycompany.api.service;

import com.mycompany.api.entity.LatexSale;
import com.mycompany.api.entity.RecordStatus;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Dựng {@link Specification} động cho GET list latex-sales (docs/TASKS.md Phase 4) — bỏ qua filter null. */
public final class LatexSaleSpecifications {

    private LatexSaleSpecifications() {
    }

    public static Specification<LatexSale> withFilters(
            UUID teamId, LocalDate fromDate, LocalDate toDate, RecordStatus status) {
        return withFilters(teamId, fromDate, toDate, status, null);
    }

    // scanBatchId — 0021-scan-batch-model, xem ghi chú tương ứng ở ProductionRecordSpecifications.
    public static Specification<LatexSale> withFilters(
            UUID teamId, LocalDate fromDate, LocalDate toDate, RecordStatus status, UUID scanBatchId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teamId != null) {
                predicates.add(cb.equal(root.get("team").get("id"), teamId));
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
