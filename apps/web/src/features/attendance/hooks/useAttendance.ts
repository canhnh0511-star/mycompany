import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/attendance.api';

export { useTeams, useEmployees } from '../../../hooks/useLookups';

export function useAttendanceByTeamAndDate(teamId: string, date: string) {
  return useQuery({
    queryKey: ['attendance-by-team-date', teamId, date],
    queryFn: () => api.getAttendanceByTeamAndDate(teamId, date),
    enabled: !!teamId && !!date,
  });
}

export function useAttendanceList(filters: api.AttendanceFilters, page: number) {
  return useQuery({ queryKey: ['attendance-list', filters, page], queryFn: () => api.listAttendance(filters, page) });
}

function useInvalidateAttendance() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['attendance-by-team-date'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
  };
}

export function useCreateAttendanceBatch() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: api.createAttendanceBatch, onSuccess: invalidate });
}

export function useUpdateAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateAttendanceInput }) => api.updateAttendance(id, body),
    onSuccess: invalidate,
  });
}

export function useCancelAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: api.cancelAttendance, onSuccess: invalidate });
}
