package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSale;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// JpaSpecificationExecutor — filter động cho GET list (docs/TASKS.md Phase 4), xem LatexSaleSpecifications.
public interface LatexSaleRepository extends JpaRepository<LatexSale, UUID>, JpaSpecificationExecutor<LatexSale> {
}
