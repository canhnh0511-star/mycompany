import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/currentUser.api';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
