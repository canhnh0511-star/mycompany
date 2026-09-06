import { apiPatch } from '../../../api/client';
import type { CurrentUser } from '../../auth/model/user.types';

// Đọc profile dùng lại `useCurrentUser`/`getCurrentUser` (features/auth) — cùng gọi GET
// /api/v1/users/me, TopBar/UserMenu đã dùng hook đó, không tạo query key thứ 2 cho cùng 1 dữ liệu.
export type { CurrentUser } from '../../auth/model/user.types';

export interface UpdateProfileInput {
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  phone: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function updateProfile(body: UpdateProfileInput): Promise<CurrentUser> {
  return apiPatch<CurrentUser>('/api/v1/users/me', undefined, body);
}

// `skipAuthRedirect` — sai mật khẩu hiện tại trả 401 nhưng KHÔNG phải phiên hết hạn, không được đá
// người dùng về /login (xem ghi chú trong `api/client.ts`).
export function changePassword(body: ChangePasswordInput): Promise<void> {
  return apiPatch<void>('/api/v1/users/me/password', undefined, body, { skipAuthRedirect: true });
}
