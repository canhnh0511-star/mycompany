package com.mycompany.api.repository;

import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    List<Employee> findByTeamId(UUID teamId);

    List<Employee> findByStatus(EmployeeStatus status);

    List<Employee> findByTeamIdAndStatus(UUID teamId, EmployeeStatus status);

    // Ràng buộc UNIQUE(user_id) ở DB (001_init_schema.sql) — check trước ở service layer để trả lỗi 409
    // rõ ràng thay vì lộ DataIntegrityViolationException thô.
    boolean existsByUserId(UUID userId);

    // Dùng khi update: bỏ qua chính employee đang sửa khi kiểm tra trùng user_id.
    boolean existsByUserIdAndIdNot(UUID userId, UUID id);
}
