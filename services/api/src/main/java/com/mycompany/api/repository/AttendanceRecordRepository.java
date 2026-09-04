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
