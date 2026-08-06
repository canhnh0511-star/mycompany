package com.mycompany.api.repository;

import com.mycompany.api.entity.AllowanceConfig;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllowanceConfigRepository extends JpaRepository<AllowanceConfig, UUID> {

    List<AllowanceConfig> findByCode(String code);
}
