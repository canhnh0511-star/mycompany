package com.mycompany.api.repository;

import com.mycompany.api.entity.EditHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EditHistoryRepository extends JpaRepository<EditHistory, UUID> {

    // JOIN FETCH editedBy — tránh N+1 khi trả list nhiều dòng (1 record có thể bị sửa nhiều lần).
    @Query("""
            SELECT eh FROM EditHistory eh JOIN FETCH eh.editedBy
            WHERE eh.tableName = :tableName AND eh.recordId = :recordId
            ORDER BY eh.editedAt DESC
            """)
    List<EditHistory> findByTableNameAndRecordId(@Param("tableName") String tableName, @Param("recordId") UUID recordId);
}
