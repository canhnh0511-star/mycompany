import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { productionSummaryApi, type ProductionSummaryDailyFilters, type TeamBreakdownFilters } from './api';

export function useProductionSummaryDailyQuery(filters: ProductionSummaryDailyFilters) {
  return useQuery({
    queryKey: queryKeys.productionSummary.daily({ ...filters }),
    queryFn: () => productionSummaryApi.daily(filters),
    enabled: !!filters.workDate,
  });
}

export function useTeamBreakdownQuery(teamId: string | null, filters: TeamBreakdownFilters) {
  return useQuery({
    queryKey: queryKeys.productionSummary.teamBreakdown(teamId ?? '', { ...filters }),
    queryFn: () => productionSummaryApi.teamBreakdown(teamId!, filters),
    enabled: !!teamId && !!filters.workDate,
  });
}
