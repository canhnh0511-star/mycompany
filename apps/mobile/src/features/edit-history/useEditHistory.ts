import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { editHistoryApi, type EditHistoryTableName } from './api';

export function useEditHistoryQuery(tableName: EditHistoryTableName, recordId: string) {
  return useQuery({
    queryKey: queryKeys.editHistory(tableName, recordId),
    queryFn: () => editHistoryApi.list(tableName, recordId),
  });
}
