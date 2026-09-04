package com.mycompany.api.repository;

import com.mycompany.api.entity.RateConfig;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RateConfigRepository extends JpaRepository<RateConfig, UUID> {

    List<RateConfig> findByLatexTypeId(UUID latexTypeId);

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);

    // Home dashboard (soldRevenue = soldKg x đơn giá hiệu lực) — EXCLUDE constraint ở DB đảm bảo tối
    // đa 1 dòng / latex_type_id thỏa điều kiện này tại 1 thời điểm (CLAUDE.md §4), nên kết quả luôn
    // là map 1-1 latexTypeCode -> unitPrice, không cần dedup ở service layer.
    @Query("""
            SELECT new com.mycompany.api.repository.EffectiveRateRow(rc.latexType.code, rc.unitPrice)
            FROM RateConfig rc
            WHERE rc.effectiveFrom <= :date
              AND (rc.effectiveTo IS NULL OR rc.effectiveTo >= :date)
            """)
    List<EffectiveRateRow> findEffectiveRatesAt(@Param("date") LocalDate date);
}
