package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecordItem;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductionRecordItemRepository extends JpaRepository<ProductionRecordItem, UUID> {

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);

    // Report sản lượng cá nhân (docs/TASKS.md Phase 4) — CHỈ tính bản ghi CONFIRMED (dữ liệu chưa duyệt
    // không được lọt vào báo cáo/bảng lương). ReportService pivot kết quả phẳng này thành ma trận.
    @Query("""
            SELECT new com.mycompany.api.repository.ProductionAggregateRow(
                pr.employee.id, pr.employee.fullName, pr.team.id, pr.team.name, pri.latexType.code, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.status = com.mycompany.api.entity.RecordStatus.CONFIRMED
              AND pr.recordDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR pr.team.id = :teamId)
              AND (:employeeId IS NULL OR pr.employee.id = :employeeId)
            GROUP BY pr.employee.id, pr.employee.fullName, pr.team.id, pr.team.name, pri.latexType.code
            """)
    List<ProductionAggregateRow> aggregateForReport(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("teamId") UUID teamId, @Param("employeeId") UUID employeeId);
}
