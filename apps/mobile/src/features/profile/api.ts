import { apiClient } from '@/lib/api/client';
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '@/types/api';

/** PATCH /users/me — cập nhật tên/avatar/chức vụ/SĐT. GET /users/me tái dùng `useMeQuery` (features/auth/api.ts). */
export const profileApi = {
  update: (body: UpdateProfileRequest) => apiClient.patch<UserProfileResponse>('/api/v1/users/me', body),
  // skipUnauthorizedHandler — 401 ở đây nghĩa là gõ sai MẬT KHẨU HIỆN TẠI, không phải hết phiên đăng
  // nhập (xem comment RequestOptions.skipUnauthorizedHandler, lib/api/client.ts). Không có cờ này sẽ bị
  // interceptor 401 toàn cục tự đăng xuất user — bug thật tìm thấy lúc test emulator 2026-08-25.
  changePassword: (body: ChangePasswordRequest) =>
    apiClient.patch<void>('/api/v1/users/me/password', body, { skipUnauthorizedHandler: true }),
};
