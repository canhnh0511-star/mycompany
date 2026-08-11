import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Nhớ thông tin đăng nhập — 2 mức, tách riêng vì mức độ nhạy cảm khác nhau:
 * 1. `lastEmail` — CHỈ email, mọi platform (kể cả web). Tự động điền lại field Email lúc mở màn Đăng
 *    nhập, đỡ phải gõ lại (email khó nhớ theo phản hồi người dùng). Không nhạy cảm, không cần Face ID.
 * 2. `credentials` — email + mật khẩu, CHỈ native (Face ID/vân tay chỉ có ý nghĩa trên thiết bị di
 *    động — web dùng trình duyệt, không có sensor sinh trắc học tương đương ở v1). Lưu trong
 *    `expo-secure-store` (Keychain/Keystore, đã mã hóa phần cứng — cùng nơi lưu JWT, `tokenStorage.ts`).
 *    Chỉ đọc lại SAU KHI Face ID/vân tay xác thực thành công (`lib/auth/biometrics.ts`), không đọc
 *    trần ra UI bao giờ.
 */
const LAST_EMAIL_KEY = 'mycompany_last_email';
const CREDENTIALS_KEY = 'mycompany_saved_credentials';

interface SavedCredentials {
  email: string;
  password: string;
}

export const credentialStorage = {
  async getLastEmail(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(LAST_EMAIL_KEY);
    }
    return SecureStore.getItemAsync(LAST_EMAIL_KEY);
  },

  async saveLastEmail(email: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(LAST_EMAIL_KEY, email);
      return;
    }
    await SecureStore.setItemAsync(LAST_EMAIL_KEY, email);
  },

  /** Không hỗ trợ web — chỉ gọi từ luồng đăng nhập native. */
  async saveCredentials(email: string, password: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
  },

  async getCredentials(): Promise<SavedCredentials | null> {
    if (Platform.OS === 'web') return null;
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedCredentials;
    } catch {
      return null;
    }
  },

  async hasSavedCredentials(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return (await SecureStore.getItemAsync(CREDENTIALS_KEY)) !== null;
  },

  /** Gọi khi mật khẩu lưu không còn đúng (Face ID login trả 401 — mật khẩu đã đổi ở nơi khác) để
   * không lặp lại đề nghị Face ID với mật khẩu cũ. */
  async clearCredentials(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  },
};
