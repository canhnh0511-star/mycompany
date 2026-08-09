import { apiClient } from '@/lib/api/client';
import type { TeamRequest, TeamResponse } from '@/types/api';

/** Gọi thẳng CRUD Teams (services/api TeamController) — không có DELETE ở v1 (CLAUDE.md §4). */
export const teamsApi = {
  list: () => apiClient.get<TeamResponse[]>('/api/v1/teams'),
  create: (body: TeamRequest) => apiClient.post<TeamResponse>('/api/v1/teams', body),
  update: (id: string, body: TeamRequest) => apiClient.patch<TeamResponse>(`/api/v1/teams/${id}`, body),
};
