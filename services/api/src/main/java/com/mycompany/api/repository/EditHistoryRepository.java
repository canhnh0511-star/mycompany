package com.mycompany.api.repository;

import com.mycompany.api.entity.EditHistory;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditHistoryRepository extends JpaRepository<EditHistory, UUID> {
}
