import { useAuthStore } from '@/features/auth/store';

/**
 * Hook duy nhất để đọc trạng thái đăng nhập/role trong feature code (ADR-0016). Ở v1 không nơi nào
 * thu hẹp theo `role` (chỉ Admin login), nhưng mọi chỗ SAU NÀY cần ẩn/hiện theo role chỉ cần check qua
 * đây — không đọc thẳng `useAuthStore` rải rác.
 */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const fullName = useAuthStore((s) => s.fullName);
  const userId = useAuthStore((s) => s.userId);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  return {
    isAuthenticated: status === 'authenticated',
    isPending: status === 'idle' || status === 'loading',
    role,
    fullName,
    userId,
    login,
    logout,
  };
}
