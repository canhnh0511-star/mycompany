import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/profile.api';

// Đọc profile: dùng thẳng `useCurrentUser` (features/auth) — cùng 1 dữ liệu, tránh 2 query key.
export { useCurrentUser as useMe } from '../../auth/hooks/useCurrentUser';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    // Ghi thẳng vào cache 'currentUser' — TopBar/UserMenu (đang dùng useCurrentUser) thấy tên/avatar
    // mới ngay, không cần đợi staleTime 5 phút hết hạn rồi mới refetch.
    onSuccess: (updated) => queryClient.setQueryData(['currentUser'], updated),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: api.changePassword });
}
