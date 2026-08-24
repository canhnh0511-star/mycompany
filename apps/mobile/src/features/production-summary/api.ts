import { apiClient } from '@/lib/api/client';
import type { ProductionSummaryDailyResponse, TeamBreakdownResponse } from '@/types/api';

export interface ProductionSummaryDailyFilters {
  workDate: string;
  teamId?: string;
  latexTypeCode?: string;
}

export interface TeamBreakdownFilters {
  workDate: string;
  latexTypeCode?: string;
}

function buildQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** "Sản lượng v2" (Phase 4/5, Spec 2 docs/specs/spec-2-san-luong-v2.md) — chỉ 2 endpoint MUST đã có
 * frontend dùng tới (`/monthly`, `/employee-search` là SHOULD, chưa có UI ở Phase 5 này). */
export const productionSummaryApi = {
  daily: (filters: ProductionSummaryDailyFilters) =>
    apiClient.get<ProductionSummaryDailyResponse>(`/api/v1/production-summary/daily?${buildQuery({ ...filters })}`),
  teamBreakdown: (teamId: string, filters: TeamBreakdownFilters) =>
    apiClient.get<TeamBreakdownResponse>(
      `/api/v1/production-summary/team/${teamId}/breakdown?${buildQuery({ ...filters })}`,
    ),
};
