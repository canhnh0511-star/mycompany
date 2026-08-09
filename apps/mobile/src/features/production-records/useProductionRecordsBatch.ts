import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { productionRecordsApi } from './api';

/** Không retry (giống mọi mutation khác, ADR-0009) — người dùng chủ động bấm lại nếu muốn. */
export function useProductionRecordsBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productionRecordsApi.createBatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.all }),
  });
}
