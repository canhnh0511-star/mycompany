import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Lưu JWT — native dùng expo-secure-store, web dùng localStorage (ADR-0010).
 * expo-secure-store KHÔNG chạy trên web nên bắt buộc phải tách nhánh theo platform.
 * Rủi ro XSS của localStorage được chấp nhận có chủ đích ở v1 (chỉ 1 vai trò Admin đăng nhập,
 * token hết hạn ngắn — 1 ngày, ADR-0004) — xem ADR-0010 để biết đầy đủ lý do.
 */
const TOKEN_KEY = 'mycompany_access_token';

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
