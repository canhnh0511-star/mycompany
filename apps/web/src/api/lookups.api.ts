import { apiGet } from './client';

/**
 * Lookup dùng chung cho nhiều feature (Bảng lương, Thành phần lương, Phiếu...) — trước đây
 * `getLatexTypes`/`getTeams` bị khóa riêng trong `salary-components`/`payroll`, mỗi feature mới lại
 * có nguy cơ tự viết thêm 1 bản trùng lặp. Gom về đây, khớp response backend tương ứng
 * (`LatexTypeResponse`/`TeamResponse`/`EmployeeResponse`).
 */

export interface LatexTypeOption {
  id: string;
  code: string;
  label: string;
  unit: string;
}

export function getLatexTypes(): Promise<LatexTypeOption[]> {
  return apiGet<LatexTypeOption[]>('/api/v1/latex-types');
}

export interface TeamOption {
  id: string;
  name: string;
  // Khớp đầy đủ TeamResponse (services/api) — 2 field dưới chỉ Cấu hình hệ thống dùng, các nơi khác
  // (Bảng lương, Phiếu...) chỉ đọc id/name như cũ.
  description?: string | null;
  createdAt?: string;
}

export function getTeams(): Promise<TeamOption[]> {
  return apiGet<TeamOption[]>('/api/v1/teams');
}

export interface EmployeeOption {
  id: string;
  fullName: string;
  teamId: string;
  teamName: string;
  status: string;
  // Khớp đầy đủ EmployeeResponse — chỉ Cấu hình hệ thống dùng các field vợ/chồng/userId/createdAt.
  userId?: string | null;
  spouseEmployeeId?: string | null;
  spouseEmployeeName?: string | null;
  createdAt?: string;
}

export interface EmployeeFilters {
  teamId?: string;
  status?: string;
}

/** Khớp `EmployeeController.list` (services/api) — chưa từng gọi ở web trước đây. */
export function getEmployees(filters?: EmployeeFilters): Promise<EmployeeOption[]> {
  return apiGet<EmployeeOption[]>('/api/v1/employees', {
    teamId: filters?.teamId,
    status: filters?.status,
  });
}
