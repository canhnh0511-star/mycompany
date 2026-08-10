import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { latexTypesApi, type CreateLatexTypeRequest, type UpdateLatexTypeRequest } from './api';

export function useLatexTypesQuery() {
  return useQuery({ queryKey: queryKeys.latexTypes.all, queryFn: latexTypesApi.list });
}

export function useCreateLatexTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLatexTypeRequest) => latexTypesApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.latexTypes.all }),
  });
}

export function useUpdateLatexTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLatexTypeRequest }) => latexTypesApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.latexTypes.all }),
  });
}

export function useDeleteLatexTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => latexTypesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.latexTypes.all }),
  });
}
