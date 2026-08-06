package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LatexTypeRepository extends JpaRepository<LatexType, UUID> {
}
