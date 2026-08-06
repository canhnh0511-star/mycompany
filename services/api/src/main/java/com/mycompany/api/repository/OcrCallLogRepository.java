package com.mycompany.api.repository;

import com.mycompany.api.entity.OcrCallLog;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// JpaSpecificationExecutor — filter động cho GET list (docs/TASKS.md Phase 4), xem OcrCallLogSpecifications.
public interface OcrCallLogRepository extends JpaRepository<OcrCallLog, UUID>, JpaSpecificationExecutor<OcrCallLog> {

    // COALESCE(SUM(...), 0) — SUM bỏ qua null (estimated_cost_usd null khi success=false) nhưng có thể
    // null toàn bộ nếu không có dòng nào khớp filter; ép về 0 để tránh NPE khi map vào BigDecimal.
    // from/to LUÔN không null khi tới đây (OcrCallLogService.stats thay null bằng sentinel trước khi
    // gọi) — pgjdbc không suy được kiểu tham số khi 1 bind param chỉ xuất hiện độc lập trong "? IS
    // NULL" (khác UUID ở ProductionRecordItemRepository.aggregateForReport lại suy được), ném
    // "could not determine data type of parameter $1" — né hẳn pattern (:x IS NULL OR ...) cho cột
    // timestamp thay vì cố sửa kiểu tham số.
    @Query("""
            SELECT new com.mycompany.api.repository.OcrStatsRaw(
                COUNT(o),
                SUM(CASE WHEN o.success = true THEN 1L ELSE 0L END),
                SUM(CASE WHEN o.typeMismatch = true THEN 1L ELSE 0L END),
                COALESCE(SUM(o.estimatedCostUsd), 0),
                AVG(o.durationMs))
            FROM OcrCallLog o
            WHERE o.calledAt BETWEEN :from AND :to
            """)
    OcrStatsRaw aggregateStats(@Param("from") Instant from, @Param("to") Instant to);
}
