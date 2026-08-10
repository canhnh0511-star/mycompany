import { apiClient } from '@/lib/api/client';
import type { AllowanceConfigRequest, AllowanceConfigResponse } from '@/types/api';

/** Không có DELETE. Chồng lấn effective_from/to theo (code) bị backend chặn 409 — nhiều dòng CÙNG code
 * theo thời gian khác nhau là hợp lệ (CLAUDE.md §4), khác RateConfig chống lấn theo latexTypeId. */
export const allowanceConfigsApi = {
  list: () => apiClient.get<AllowanceConfigResponse[]>('/api/v1/allowance-configs'),
  create: (body: AllowanceConfigRequest) =>
    apiClient.post<AllowanceConfigResponse>('/api/v1/allowance-configs', body),
  update: (id: string, body: AllowanceConfigRequest) =>
    apiClient.patch<AllowanceConfigResponse>(`/api/v1/allowance-configs/${id}`, body),
};
