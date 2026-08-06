package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecordItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRecordItemRepository extends JpaRepository<ProductionRecordItem, UUID> {
}
