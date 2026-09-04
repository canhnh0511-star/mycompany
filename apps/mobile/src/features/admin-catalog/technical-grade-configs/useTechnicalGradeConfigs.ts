import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { TechnicalGradeConfigRequest } from '@/types/api';
import { technicalGradeConfigsApi } from './api';

export function useTechnicalGradeConfigsQuery() {
  return useQuery({ queryKey: queryKeys.technicalGradeConfigs.all, queryFn: technicalGradeConfigsApi.list });
}

export function useCreateTechnicalGradeConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TechnicalGradeConfigRequest) => technicalGradeConfigsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.technicalGradeConfigs.all }),
  });
}

export function useUpdateTechnicalGradeConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TechnicalGradeConfigRequest }) =>
      technicalGradeConfigsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.technicalGradeConfigs.all }),
  });
}
