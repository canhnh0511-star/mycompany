import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { PayrollMixedLatexRateConfigRequest } from '@/types/api';
import { payrollMixedLatexRateConfigsApi } from './api';

export function usePayrollMixedLatexRateConfigsQuery() {
  return useQuery({
    queryKey: queryKeys.payrollMixedLatexRateConfigs.all,
    queryFn: payrollMixedLatexRateConfigsApi.list,
  });
}

export function useCreatePayrollMixedLatexRateConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayrollMixedLatexRateConfigRequest) => payrollMixedLatexRateConfigsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.payrollMixedLatexRateConfigs.all }),
  });
}

export function useUpdatePayrollMixedLatexRateConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayrollMixedLatexRateConfigRequest }) =>
      payrollMixedLatexRateConfigsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.payrollMixedLatexRateConfigs.all }),
  });
}
