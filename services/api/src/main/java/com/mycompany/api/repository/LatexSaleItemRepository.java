package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSaleItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LatexSaleItemRepository extends JpaRepository<LatexSaleItem, UUID> {

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);
}
