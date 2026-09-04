import { apiClient } from '@/lib/api/client';
import type {
  PayrollDetailResponse,
  PayrollRowResponse,
  PayrollSummaryResponse,
  UpdateDeductionRequest,
  UpdateTechnicalGradeRequest,
} from '@/types/api';

export interface PayrollFilters {
  yearMonth: string; // 'YYYY-MM'
  teamId?: string;
  status?: string;
  query?: string;
}

function buildQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** Module 3 — Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). Số liệu LUÔN suy ra từ
 * dữ liệu nguồn (PayrollController backend) — không có endpoint sửa trực tiếp tổng lương. */
export const payrollApi = {
  summary: (filters: PayrollFilters) =>
    apiClient.get<PayrollSummaryResponse>(`/api/v1/payroll?${buildQuery({ ...filters })}`),
  detail: (employeeId: string, yearMonth: string) =>
    apiClient.get<PayrollDetailResponse>(`/api/v1/payroll/${employeeId}?yearMonth=${yearMonth}`),
  updateDeduction: (employeeId: string, yearMonth: string, body: UpdateDeductionRequest) =>
    apiClient.patch<PayrollRowResponse>(`/api/v1/payroll/${employeeId}/deduction?yearMonth=${yearMonth}`, body),
  updateTechnicalGrade: (employeeId: string, yearMonth: string, body: UpdateTechnicalGradeRequest) =>
    apiClient.patch<PayrollRowResponse>(
      `/api/v1/payroll/${employeeId}/technical-grade?yearMonth=${yearMonth}`, body),
  lock: (yearMonth: string) => apiClient.post<PayrollSummaryResponse>(`/api/v1/payroll/lock?yearMonth=${yearMonth}`),
  unlock: (yearMonth: string) =>
    apiClient.post<PayrollSummaryResponse>(`/api/v1/payroll/unlock?yearMonth=${yearMonth}`),
};
