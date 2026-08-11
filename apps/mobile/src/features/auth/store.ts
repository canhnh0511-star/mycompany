import { create } from 'zustand';
import { ApiError, apiClient } from '@/lib/api/client';
import { biometrics } from '@/lib/auth/biometrics';
import { credentialStorage } from '@/lib/auth/credentialStorage';
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
  /** Đăng nhập nhanh — Face ID/vân tay (native) mở khóa email+mật khẩu đã lưu, tự gọi lại `login()`
   * bên dưới. Ném lỗi rõ ràng nếu chưa từng lưu hoặc xác thực sinh trắc học không thành công. */
  loginWithBiometrics: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Auth store — nguồn sự thật cho trạng thái đăng nhập toàn app. `role` được đọc ra nhưng KHÔNG dùng để
 * ẩn/hiện màn hình ở v1 (release 1 chỉ Admin login — ADR-0016); giữ sẵn ở đây để mở role khác sau này
 * không phải sửa lại chỗ lưu state.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
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
      // Best-effort — lỗi ghi credentialStorage KHÔNG được làm hỏng luồng đăng nhập chính (vd
      // SecureStore lỗi lạ trên 1 thiết bị cụ thể). Ghi cả 2: lastEmail (mọi platform, chỉ để tự điền
      // field) và credentials đầy đủ (native, gate bằng Face ID/vân tay lúc ĐỌC LẠI — xem
      // loginWithBiometrics bên dưới, không phải lúc ghi).
      credentialStorage.saveLastEmail(email).catch(() => {});
      credentialStorage.saveCredentials(email, password).catch(() => {});
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

  loginWithBiometrics: async () => {
    const saved = await credentialStorage.getCredentials();
    if (!saved) {
      throw new Error('Chưa có thông tin đăng nhập đã lưu — hãy đăng nhập bằng email/mật khẩu trước.');
    }
    const authenticated = await biometrics.authenticate();
    if (!authenticated) {
      throw new Error('Xác thực Face ID/vân tay không thành công.');
    }
    try {
      await get().login(saved);
    } catch (err) {
      // 401 nghĩa là mật khẩu đã lưu không còn đúng (đổi mật khẩu ở nơi khác) — xóa luôn, tránh Face
      // ID cứ mời đăng nhập lại bằng mật khẩu cũ đã biết chắc sai.
      if (err instanceof ApiError && err.status === 401) {
        await credentialStorage.clearCredentials();
      }
      throw err;
    }
  },

  logout: async () => {
    await tokenStorage.clear();
    // KHÔNG xóa credentialStorage lúc logout — vẫn cần cho lần đăng nhập nhanh (Face ID) tiếp theo,
    // đúng mục đích tính năng. Chỉ xóa khi mật khẩu đã lưu sai (nhánh 401 ở loginWithBiometrics trên).
    set({ accessToken: null, userId: null, fullName: null, role: null, status: 'unauthenticated' });
  },
}));
