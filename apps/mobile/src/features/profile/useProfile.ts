import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { profileApi } from './api';
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/types/api';

/** Màn 11 Chỉnh sửa hồ sơ + màn 12 Ảnh đại diện (avatar chỉ là 1 field trong cùng request PATCH). */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => profileApi.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

/** Màn 13 Đổi mật khẩu — không cần invalidate gì (không đổi dữ liệu hiển thị nào khác). */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body),
  });
}
