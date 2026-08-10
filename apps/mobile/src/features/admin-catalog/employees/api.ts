import { apiClient } from '@/lib/api/client';
import type { EmployeeResponse, EmployeeStatus } from '@/types/api';

export interface EmployeeRequest {
  fullName: string;
  teamId: string;
  /** Chỉ có trên Update — Create luôn mặc định 'active' ở backend, không nhận field này. */
  status?: EmployeeStatus;
  userId: string | null;
}

/** CRUD Employees (services/api EmployeeController) — không có DELETE, chỉ đổi status active/inactive. */
export const employeesApi = {
  list: (filters: { teamId?: string; status?: EmployeeStatus } = {}) => {
    const params = new URLSearchParams();
    if (filters.teamId) params.set('teamId', filters.teamId);
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return apiClient.get<EmployeeResponse[]>(`/api/v1/employees${qs ? `?${qs}` : ''}`);
  },
  create: (body: Omit<EmployeeRequest, 'status'>) =>
    apiClient.post<EmployeeResponse>('/api/v1/employees', body),
  update: (id: string, body: EmployeeRequest) =>
    apiClient.patch<EmployeeResponse>(`/api/v1/employees/${id}`, body),
};
