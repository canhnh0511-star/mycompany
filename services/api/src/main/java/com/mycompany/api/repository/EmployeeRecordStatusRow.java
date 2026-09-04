package com.mycompany.api.repository;

import com.mycompany.api.entity.RecordStatus;
import java.util.UUID;

/**
 * Projection thô cho {@link ProductionRecordRepository#countStatusByEmployee} — số dòng
 * production_records theo (nhân viên, status) trong 1 tháng, dùng để derive rowStatus của Bảng
 * lương (docs/specs/spec-3-bang-luong-v1-draft.md mục 2.5): còn DRAFT → "Cần kiểm tra"; có record
 * nhưng không DRAFT → "Đã xác nhận"; không có row nào → "Thiếu dữ liệu".
 */
public record EmployeeRecordStatusRow(UUID employeeId, RecordStatus status, Long count) {
}
