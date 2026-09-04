package com.mycompany.api.repository;

import com.mycompany.api.entity.PayrollPeriodLock;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollPeriodLockRepository extends JpaRepository<PayrollPeriodLock, String> {
}
