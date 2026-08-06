package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSaleItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LatexSaleItemRepository extends JpaRepository<LatexSaleItem, UUID> {
}
