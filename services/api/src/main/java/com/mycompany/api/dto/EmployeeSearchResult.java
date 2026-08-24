package com.mycompany.api.dto;

import java.util.UUID;

/**
 * GET /api/v1/production-summary/employee-search (Spec 2 §38, SHOULD). Chỉ search theo tên — domain
 * hiện tại KHÔNG có mã nhân viên (audit Phase 4: Employee entity không có cột code), nên bỏ nhánh
 * "Mã nhân viên" nêu trong spec (điều kiện "nếu domain có mã nhân viên" không thỏa).
 */
public record EmployeeSearchResult(UUID employeeId, String employeeName, UUID teamId, String teamName) {
}
