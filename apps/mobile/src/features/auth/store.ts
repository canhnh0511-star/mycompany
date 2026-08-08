import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import type { LoginRequest, LoginResponse, Role } from '@/types/api';

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  accessToken: string | null;
  userId: string | null;
  fullName: string | null;
  role: Role | null;
  /** Đọc token đã lưu (nếu có) lúc app khởi động — gọi 1 lần từ root layout. */
  hydrate: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Auth store — nguồn sự thật cho trạng thái đăng nhập toàn app. `role` được đọc ra nhưng KHÔNG dùng để
 * ẩn/hiện màn hình ở v1 (release 1 chỉ Admin login — ADR-0016); giữ sẵn ở đây để mở role khác sau này
 * không phải sửa lại chỗ lưu state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  accessToken: null,
  userId: null,
  fullName: null,
  role: null,

  hydrate: async () => {
    const token = await tokenStorage.get();
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }
    // Không có endpoint "verify token" riêng — coi có token là authenticated lạc quan. Nếu token đã hết
    // hạn (JWT 1 ngày, không refresh — ADR-0004), lời gọi API thật đầu tiên sẽ 401 và tự bị interceptor
    // (ADR-0009) logout + điều hướng login, không cần tự kiểm tra hạn ở đây.
    set({ accessToken: token, status: 'authenticated' });
  },

  login: async ({ email, password }) => {
    set({ status: 'loading' });
    try {
      const res = await apiClient.post<LoginResponse>(
        '/api/v1/auth/login',
        { email, password },
        { skipAuth: true },
      );
      await tokenStorage.set(res.accessToken);
      set({
        accessToken: res.accessToken,
        userId: res.userId,
        fullName: res.fullName,
        role: res.role,
        status: 'authenticated',
      });
    } catch (err) {
      set({ status: 'unauthenticated' });
      throw err;
    }
  },

  logout: async () => {
    await tokenStorage.clear();
    set({ accessToken: null, userId: null, fullName: null, role: null, status: 'unauthenticated' });
  },
}));
