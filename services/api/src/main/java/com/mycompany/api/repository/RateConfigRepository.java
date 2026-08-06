package com.mycompany.api.repository;

import com.mycompany.api.entity.RateConfig;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateConfigRepository extends JpaRepository<RateConfig, UUID> {

    List<RateConfig> findByLatexTypeId(UUID latexTypeId);

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);
}
