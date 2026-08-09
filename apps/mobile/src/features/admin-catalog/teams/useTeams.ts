import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { TeamRequest } from '@/types/api';
import { teamsApi } from './api';

/** Không có filter/pagination — danh sách Tổ nhỏ (CLAUDE.md §4), trả thẳng mảng đầy đủ. */
export function useTeamsQuery() {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: teamsApi.list,
  });
}

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TeamRequest) => teamsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.teams.all }),
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeamRequest }) => teamsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.teams.all }),
  });
}
