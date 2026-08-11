import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { ocrMonitoringApi, type OcrCallLogFilters } from './api';

export function useOcrCallLogsQuery(filters: OcrCallLogFilters) {
  return useQuery({
    queryKey: queryKeys.ocrCallLogs.list(filters as Record<string, unknown>),
    queryFn: () => ocrMonitoringApi.list(filters),
  });
}

export function useOcrCallLogStatsQuery(filters: Pick<OcrCallLogFilters, 'fromDate' | 'toDate'>) {
  return useQuery({
    queryKey: queryKeys.ocrCallLogs.stats(filters as Record<string, unknown>),
    queryFn: () => ocrMonitoringApi.stats(filters),
  });
}
