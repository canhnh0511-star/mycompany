package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSaleItem;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LatexSaleItemRepository extends JpaRepository<LatexSaleItem, UUID> {

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);

    // Report bán mủ theo Tổ (docs/TASKS.md Phase 4) — CHỈ tính bản ghi APPROVED, cùng lý do với
    // ProductionRecordItemRepository.aggregateForReport.
    @Query("""
            SELECT new com.mycompany.api.repository.LatexSaleAggregateRow(
                ls.team.id, ls.team.name, lsi.latexType.code, SUM(lsi.kg))
            FROM LatexSaleItem lsi
              JOIN lsi.latexSale ls
            WHERE ls.status = com.mycompany.api.entity.RecordStatus.APPROVED
              AND ls.recordDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR ls.team.id = :teamId)
            GROUP BY ls.team.id, ls.team.name, lsi.latexType.code
            """)
    List<LatexSaleAggregateRow> aggregateForReport(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate, @Param("teamId") UUID teamId);
}
