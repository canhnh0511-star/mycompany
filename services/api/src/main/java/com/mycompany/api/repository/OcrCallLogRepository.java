package com.mycompany.api.repository;

import com.mycompany.api.entity.OcrCallLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OcrCallLogRepository extends JpaRepository<OcrCallLog, UUID> {
}
