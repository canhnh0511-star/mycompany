import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Lưu preference KHÔNG nhạy cảm (giao diện, ngôn ngữ...) — cùng pattern SecureStore/web localStorage đã
 * dùng ở `lib/auth/credentialStorage.ts` (không cần mã hóa phần cứng cho preference, nhưng tái dùng
 * SecureStore cho đơn giản thay vì thêm dependency AsyncStorage mới chỉ để lưu vài string ngắn).
 */
export const settingsStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};
