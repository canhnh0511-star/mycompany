package com.mycompany.api.repository;

import com.mycompany.api.entity.LatexSale;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LatexSaleRepository extends JpaRepository<LatexSale, UUID> {
}
