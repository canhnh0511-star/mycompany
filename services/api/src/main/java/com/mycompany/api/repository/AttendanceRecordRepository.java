package com.mycompany.api.repository;

import com.mycompany.api.entity.AttendanceRecord;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// JpaSpecificationExecutor — filter động cho GET list (docs/TASKS.md Phase 4), xem AttendanceRecordSpecifications.
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID>,
        JpaSpecificationExecutor<AttendanceRecord> {

    // Module 3 (Bảng lương) — tổng quantity theo (nhân viên, loại chấm công) trong tháng, KHÔNG tính
    // CANCELLED. Lọc theo Tổ qua employee.team (attendance_records không có team_id riêng — CLAUDE.md
    // §4, suy ra qua employee, không có điều động tạm). employeeId optional — dùng chung cho cả
    // summary (toàn Tổ) lẫn detail (1 nhân viên).
    @Query("""
            SELECT new com.mycompany.api.repository.AttendanceAggregateRow(ar.employee.id, ar.attendanceType, SUM(ar.quantity))
            FROM AttendanceRecord ar
            WHERE ar.recordDate BETWEEN :fromDate AND :toDate
              AND ar.status <> com.mycompany.api.entity.AttendanceRecordStatus.CANCELLED
              AND (:teamId IS NULL OR ar.employee.team.id = :teamId)
              AND (:employeeId IS NULL OR ar.employee.id = :employeeId)
            GROUP BY ar.employee.id, ar.attendanceType
            """)
    List<AttendanceAggregateRow> aggregateForPayroll(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("teamId") UUID teamId, @Param("employeeId") UUID employeeId);

    // Home dashboard payroll-summary distribution — nhân viên ACTIVE có ít nhất 1 attendance_record
    // active (status <> cancelled) trong tháng -> "complete" (cùng tiêu chí OR với production_record,
    // xem ProductionRecordRepository.findDistinctActiveEmployeeIdsInRange).
    @Query("""
            SELECT DISTINCT a.employee.id
            FROM AttendanceRecord a
            WHERE a.recordDate BETWEEN :from AND :to
              AND a.status <> com.mycompany.api.entity.AttendanceRecordStatus.CANCELLED
            """)
    List<UUID> findDistinctActiveEmployeeIdsInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
