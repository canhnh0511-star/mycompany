import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryClient';
import type { EmployeeResponse, EmployeeStatus, LatexTypeResponse, TeamResponse } from '@/types/api';

/**
 * Lookup read-only dùng chung cho các feature KHÁC admin-catalog (form nhập tay nhanh, chọn Tổ/nhân
 * viên/loại mủ khi tạo record). CRUD đầy đủ (create/update) nằm ở `teams/` — file này chỉ list.
 */
export function useTeamsLookupQuery() {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: () => apiClient.get<TeamResponse[]>('/api/v1/teams'),
  });
}

export function useEmployeesLookupQuery(filters: { teamId?: string; status?: EmployeeStatus } = {}) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.teamId) params.set('teamId', filters.teamId);
      if (filters.status) params.set('status', filters.status);
      const qs = params.toString();
      return apiClient.get<EmployeeResponse[]>(`/api/v1/employees${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useLatexTypesLookupQuery() {
  return useQuery({
    queryKey: queryKeys.latexTypes.all,
    queryFn: () => apiClient.get<LatexTypeResponse[]>('/api/v1/latex-types'),
  });
}
