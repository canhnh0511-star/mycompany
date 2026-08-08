import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryClient';
import type { UserProfileResponse } from '@/types/api';

/** Tab Hồ sơ — GET /api/v1/users/me. `enabled` truyền vào để không gọi khi chưa authenticated. */
export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiClient.get<UserProfileResponse>('/api/v1/users/me'),
    enabled,
  });
}
