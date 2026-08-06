package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecord;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRecordRepository extends JpaRepository<ProductionRecord, UUID> {
}
