import { apiClient } from '@/lib/api/client';
import type { RateConfigRequest, RateConfigResponse } from '@/types/api';

/** Không có DELETE — giữ lịch sử đơn giá (CLAUDE.md §4). Overlap effective_from/to chặn 409 ở backend. */
export const rateConfigsApi = {
  list: () => apiClient.get<RateConfigResponse[]>('/api/v1/rate-configs'),
  create: (body: RateConfigRequest) => apiClient.post<RateConfigResponse>('/api/v1/rate-configs', body),
  update: (id: string, body: RateConfigRequest) =>
    apiClient.patch<RateConfigResponse>(`/api/v1/rate-configs/${id}`, body),
};
