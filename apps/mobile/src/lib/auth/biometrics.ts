import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/** Bọc `expo-local-authentication` — gọi chung "Face ID/vân tay" thay vì phân biệt loại sensor cụ thể
 * (Face ID trên iOS, fingerprint/face unlock trên Android, `authenticateAsync` tự chọn loại hệ điều
 * hành hỗ trợ). Không dùng trên web (không có sensor tương đương ở v1). */
export const biometrics = {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  },

  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Xác thực để đăng nhập',
      cancelLabel: 'Hủy',
      disableDeviceFallback: false, // cho phép PIN/mật khẩu thiết bị làm phương án dự phòng của hệ điều hành
    });
    return result.success;
  },
};
