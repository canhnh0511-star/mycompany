import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { latexSalesApi } from './api';

export function useLatexSalesBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: latexSalesApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.all });
      // Xem comment tương ứng ở useProductionRecordsBatch.ts — reports là namespace riêng.
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
