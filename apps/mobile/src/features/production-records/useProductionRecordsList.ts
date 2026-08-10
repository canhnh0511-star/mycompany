import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { productionRecordsApi, type ProductionRecordFilters } from './api';

export function useProductionRecordsListQuery(filters: ProductionRecordFilters) {
  return useQuery({
    queryKey: queryKeys.productionRecords.list(filters as Record<string, unknown>),
    queryFn: () => productionRecordsApi.list(filters),
  });
}

export function useProductionRecordQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.productionRecords.detail(id ?? ''),
    queryFn: () => productionRecordsApi.get(id!),
    enabled: !!id,
  });
}

export function useCancelProductionRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productionRecordsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.all }),
  });
}
