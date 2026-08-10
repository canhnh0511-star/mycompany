import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { EmployeeRequest } from './api';
import { employeesApi } from './api';

export function useEmployeesQuery() {
  return useQuery({
    queryKey: queryKeys.employees.list({}),
    queryFn: () => employeesApi.list(),
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<EmployeeRequest, 'status'>) => employeesApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EmployeeRequest }) => employeesApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  });
}
