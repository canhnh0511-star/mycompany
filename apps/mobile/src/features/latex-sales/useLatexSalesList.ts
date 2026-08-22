import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { latexSalesApi, type LatexSaleFilters } from './api';

export function useLatexSalesListQuery(filters: LatexSaleFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.latexSales.list(filters as Record<string, unknown>),
    queryFn: () => latexSalesApi.list(filters),
    enabled: options.enabled,
  });
}

export function useLatexSaleQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.latexSales.detail(id ?? ''),
    queryFn: () => latexSalesApi.get(id!),
    enabled: !!id,
  });
}

export function useCancelLatexSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => latexSalesApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.all }),
  });
}
