package com.mycompany.api.repository;

import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    List<Employee> findByTeamId(UUID teamId);

    // Sản lượng v2, Spec 2 §38 (SHOULD) — search theo tên, chỉ ACTIVE (nhân viên inactive không còn
    // phát sinh sản lượng mới, không cần lộ ra ở đây). Không search theo mã nhân viên — domain hiện
    // không có cột này (audit Phase 4).
    @Query("""
            SELECT e FROM Employee e
            WHERE e.status = com.mycompany.api.entity.EmployeeStatus.ACTIVE
              AND LOWER(e.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
              AND (:teamId IS NULL OR e.team.id = :teamId)
            ORDER BY e.fullName
            """)
    List<Employee> searchActiveByFullName(@Param("query") String query, @Param("teamId") UUID teamId);

    List<Employee> findByStatus(EmployeeStatus status);

    List<Employee> findByTeamIdAndStatus(UUID teamId, EmployeeStatus status);

    // Ràng buộc UNIQUE(user_id) ở DB (001_init_schema.sql) — check trước ở service layer để trả lỗi 409
    // rõ ràng thay vì lộ DataIntegrityViolationException thô.
    boolean existsByUserId(UUID userId);

    // Dùng khi update: bỏ qua chính employee đang sửa khi kiểm tra trùng user_id.
    boolean existsByUserIdAndIdNot(UUID userId, UUID id);
}
