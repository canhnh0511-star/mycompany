import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { attendanceRecordsApi } from './api';

export function useAttendanceRecordsBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceRecordsApi.createBatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.attendanceRecords.all }),
  });
}
