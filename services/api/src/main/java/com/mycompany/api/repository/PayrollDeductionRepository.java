package com.mycompany.api.repository;

import com.mycompany.api.entity.PayrollDeduction;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollDeductionRepository extends JpaRepository<PayrollDeduction, UUID> {

    Optional<PayrollDeduction> findByEmployeeIdAndYearMonth(UUID employeeId, String yearMonth);

    List<PayrollDeduction> findByYearMonth(String yearMonth);
}
