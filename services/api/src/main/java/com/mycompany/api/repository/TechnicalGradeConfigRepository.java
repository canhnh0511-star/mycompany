package com.mycompany.api.repository;

import com.mycompany.api.entity.TechnicalGrade;
import com.mycompany.api.entity.TechnicalGradeConfig;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TechnicalGradeConfigRepository extends JpaRepository<TechnicalGradeConfig, UUID> {

    List<TechnicalGradeConfig> findByGrade(TechnicalGrade grade);
}
