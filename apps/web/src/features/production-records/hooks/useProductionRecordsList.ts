import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/productionRecordsList.api';

export { useTeams, useEmployees } from '../../../hooks/useLookups';
export { useLatexTypes } from '../../../hooks/useLookups';

export function useProductionRecordsList(filters: api.ProductionRecordsFilters, page: number) {
  return useQuery({
    queryKey: ['production-records-list', filters, page],
    queryFn: () => api.listProductionRecords(filters, page),
  });
}

export function useProductionRecord(id: string | null) {
  return useQuery({
    queryKey: ['production-record', id],
    queryFn: () => api.getProductionRecord(id as string),
    enabled: !!id,
  });
}

function useInvalidateList() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['production-records-list'] });
    queryClient.invalidateQueries({ queryKey: ['production-record'] });
  };
}

export function useApproveProductionRecord() {
  const invalidate = useInvalidateList();
  return useMutation({ mutationFn: api.approveProductionRecord, onSuccess: invalidate });
}

export function useCancelProductionRecord() {
  const invalidate = useInvalidateList();
  return useMutation({ mutationFn: api.cancelProductionRecord, onSuccess: invalidate });
}
