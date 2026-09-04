import { apiClient } from '@/lib/api/client';
import type { TechnicalGradeConfigRequest, TechnicalGradeConfigResponse } from '@/types/api';

/** "Hạng kỹ thuật" (Module 3 — Bảng lương). Không có DELETE — giữ lịch sử đơn giá (CLAUDE.md §4). */
export const technicalGradeConfigsApi = {
  list: () => apiClient.get<TechnicalGradeConfigResponse[]>('/api/v1/technical-grade-configs'),
  create: (body: TechnicalGradeConfigRequest) =>
    apiClient.post<TechnicalGradeConfigResponse>('/api/v1/technical-grade-configs', body),
  update: (id: string, body: TechnicalGradeConfigRequest) =>
    apiClient.patch<TechnicalGradeConfigResponse>(`/api/v1/technical-grade-configs/${id}`, body),
};
