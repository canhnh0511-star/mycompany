package com.mycompany.api.service;

import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.OcrTargetType;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * Dựng {@link Specification} động cho GET list ocr_call_logs (docs/TASKS.md Phase 4). Lọc theo
 * calledAt bằng Instant trực tiếp (timestamp kỹ thuật, không phải record_date nghiệp vụ như các
 * resource khác).
 */
public final class OcrCallLogSpecifications {

    private OcrCallLogSpecifications() {
    }

    public static Specification<OcrCallLog> withFilters(
            OcrTargetType targetType, Boolean success, Instant from, Instant to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (targetType != null) {
                predicates.add(cb.equal(root.get("targetType"), targetType));
            }
            if (success != null) {
                predicates.add(cb.equal(root.get("success"), success));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("calledAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("calledAt"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
