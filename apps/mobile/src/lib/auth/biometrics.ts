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
      // true — CHỈ Face ID/vân tay, không rơi về màn hình nhập mã PIN/mật khẩu điện thoại. Trước đó
      // để false (cho phép fallback) khiến hệ điều hành bắt gõ mật khẩu thiết bị thay vì quét khuôn
      // mặt — sai tinh thần "Đăng nhập bằng khuôn mặt" của chính nút này (đã có nút "Đăng nhập" gõ
      // tay riêng ngay bên dưới cho trường hợp sinh trắc học không dùng được, không cần OS tự fallback).
      disableDeviceFallback: true,
    });
    return result.success;
  },
};
