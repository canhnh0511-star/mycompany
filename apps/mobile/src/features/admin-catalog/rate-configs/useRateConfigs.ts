import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { RateConfigRequest } from '@/types/api';
import { rateConfigsApi } from './api';

export function useRateConfigsQuery() {
  return useQuery({ queryKey: queryKeys.rateConfigs.all, queryFn: rateConfigsApi.list });
}

export function useCreateRateConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RateConfigRequest) => rateConfigsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rateConfigs.all }),
  });
}

export function useUpdateRateConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RateConfigRequest }) => rateConfigsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rateConfigs.all }),
  });
}
