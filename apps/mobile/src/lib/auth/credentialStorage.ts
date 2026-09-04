import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Nhớ thông tin đăng nhập — 3 mức, tách riêng vì mức độ nhạy cảm khác nhau:
 * 1. `lastEmail` — CHỈ định danh đăng nhập (hiện field UI là Số điện thoại, nhưng giá trị này vẫn được
 *    gửi lên backend qua field `email` của LoginRequest — xem gap ở login.tsx), mọi platform (kể cả
 *    web). Tự động điền lại field lúc mở màn Đăng nhập, đỡ phải gõ lại. Không nhạy cảm, không cần Face ID.
 * 2. `lastFullName` — tên hiển thị của lần đăng nhập thành công gần nhất (mọi platform). Dùng để hiện
 *    "Chào + tên" thay vì bắt gõ lại định danh đăng nhập mỗi lần mở app (màn login.tsx). Không nhạy cảm.
 * 3. `credentials` — định danh + mật khẩu, CHỈ native (Face ID/vân tay chỉ có ý nghĩa trên thiết bị di
 *    động — web dùng trình duyệt, không có sensor sinh trắc học tương đương ở v1). Lưu trong
 *    `expo-secure-store` (Keychain/Keystore, đã mã hóa phần cứng — cùng nơi lưu JWT, `tokenStorage.ts`).
 *    Trước đây chỉ ghi khi có Face ID (đọc lại sau khi xác thực sinh trắc học) — nay còn được ghi độc
 *    lập khi user bật checkbox "Ghi nhớ mật khẩu" ở màn đăng nhập (login.tsx), kể cả thiết bị không có
 *    Face ID/vân tay. Không đọc trần mật khẩu ra UI bao giờ ở cả 2 luồng.
 */
const LAST_EMAIL_KEY = 'mycompany_last_email';
const LAST_FULL_NAME_KEY = 'mycompany_last_full_name';
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

  async getLastFullName(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(LAST_FULL_NAME_KEY);
    }
    return SecureStore.getItemAsync(LAST_FULL_NAME_KEY);
  },

  async saveLastFullName(fullName: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(LAST_FULL_NAME_KEY, fullName);
      return;
    }
    await SecureStore.setItemAsync(LAST_FULL_NAME_KEY, fullName);
  },

  /** Gọi khi user bấm "Đổi tài khoản" ở màn đăng nhập — quay lại form nhập đầy đủ, không còn hiện
   * "Chào + tên" cho tài khoản cũ. KHÔNG xóa `credentials` (Face ID) ở đây — đó là quyết định riêng của
   * user qua nút "Tắt đăng nhập bằng Face ID / vân tay" ở tab Hồ sơ. */
  async clearLastAccount(): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
      window.localStorage.removeItem(LAST_FULL_NAME_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(LAST_EMAIL_KEY);
    await SecureStore.deleteItemAsync(LAST_FULL_NAME_KEY);
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
