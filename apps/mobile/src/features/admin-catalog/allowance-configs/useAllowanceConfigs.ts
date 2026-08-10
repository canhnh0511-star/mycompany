import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { AllowanceConfigRequest } from '@/types/api';
import { allowanceConfigsApi } from './api';

export function useAllowanceConfigsQuery() {
  return useQuery({ queryKey: queryKeys.allowanceConfigs.all, queryFn: allowanceConfigsApi.list });
}

export function useCreateAllowanceConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AllowanceConfigRequest) => allowanceConfigsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.allowanceConfigs.all }),
  });
}

export function useUpdateAllowanceConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AllowanceConfigRequest }) => allowanceConfigsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.allowanceConfigs.all }),
  });
}
