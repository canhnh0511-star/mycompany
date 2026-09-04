package com.mycompany.api.repository;

import com.mycompany.api.entity.PayrollMixedLatexRateConfig;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollMixedLatexRateConfigRepository extends JpaRepository<PayrollMixedLatexRateConfig, UUID> {
}
