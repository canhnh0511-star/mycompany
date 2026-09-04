package com.mycompany.api.repository;

import com.mycompany.api.entity.EmployeeTechnicalGradeAssignment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeTechnicalGradeAssignmentRepository extends JpaRepository<EmployeeTechnicalGradeAssignment, UUID> {

    Optional<EmployeeTechnicalGradeAssignment> findByEmployeeIdAndYearMonth(UUID employeeId, String yearMonth);

    List<EmployeeTechnicalGradeAssignment> findByYearMonth(String yearMonth);
}
