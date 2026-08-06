package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LatexTypeRepository extends JpaRepository<LatexType, UUID> {

    boolean existsByCode(String code);

    // Dùng ở OcrCaptureService — ClaudeOcrService chỉ trả code (string, ép qua enum trong tool
    // schema), cần resolve sang id trước khi ghi ProductionRecordItem/LatexSaleItem.
    Optional<LatexType> findByCode(String code);
}
