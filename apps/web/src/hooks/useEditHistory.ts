import { useQuery } from '@tanstack/react-query';
import { getEditHistory } from '../api/editHistory.api';

export function useEditHistory(tableName: string, recordId: string | null) {
  return useQuery({
    queryKey: ['edit-history', tableName, recordId],
    queryFn: () => getEditHistory(tableName, recordId as string),
    enabled: !!recordId,
  });
}
