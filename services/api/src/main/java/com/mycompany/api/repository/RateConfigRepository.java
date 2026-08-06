package com.mycompany.api.repository;

import com.mycompany.api.entity.RateConfig;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateConfigRepository extends JpaRepository<RateConfig, UUID> {
}
