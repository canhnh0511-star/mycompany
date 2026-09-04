import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { productionRecordsApi } from './api';

/** Không retry (giống mọi mutation khác, ADR-0009) — người dùng chủ động bấm lại nếu muốn. */
export function useProductionRecordsBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productionRecordsApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.all });
      // Nhập tay confirmed ngay (ADR-0007) — Hôm nay/Ngày làm việc đọc report (namespace riêng, xem
      // queryKeys.reports.all) cần invalidate cùng lúc, không tự trôi theo productionRecords.
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
