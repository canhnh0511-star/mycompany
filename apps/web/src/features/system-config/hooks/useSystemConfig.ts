import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/systemConfig.api';

export { useTeams, useEmployees } from '../../../hooks/useLookups';

function useInvalidate(queryKey: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [queryKey] });
}

export function useCreateTeam() {
  const invalidate = useInvalidate('teams');
  return useMutation({ mutationFn: api.createTeam, onSuccess: invalidate });
}
export function useUpdateTeam() {
  const invalidate = useInvalidate('teams');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateTeamInput }) => api.updateTeam(id, body),
    onSuccess: invalidate,
  });
}

export function useCreateEmployee() {
  const invalidate = useInvalidate('employees');
  return useMutation({ mutationFn: api.createEmployee, onSuccess: invalidate });
}
export function useUpdateEmployee() {
  const invalidate = useInvalidate('employees');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateEmployeeInput }) => api.updateEmployee(id, body),
    onSuccess: invalidate,
  });
}
