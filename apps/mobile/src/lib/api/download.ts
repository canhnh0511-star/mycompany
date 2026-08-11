import { Platform } from 'react-native';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { ApiError } from '@/lib/api/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

/**
 * Tải file nhị phân (Excel/PDF) có gắn Authorization — `apiClient` (client.ts) chỉ hiểu JSON nên
 * export report cần đường riêng. Tách theo platform (ADR-0014): web dùng blob URL + `<a download>`
 * (trình duyệt tự có cơ chế Downloads), native dùng `expo-file-system` tải về sandbox app rồi
 * `expo-sharing` mở share sheet hệ điều hành (không có "Downloads" tương đương native).
 */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const token = await tokenStorage.get();
  const url = `${API_BASE_URL}${path}`;

  if (Platform.OS === 'web') {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new ApiError(response.status, `Xuất file thất bại (${response.status})`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  // Native: import động — expo-file-system/expo-sharing chỉ cần thiết trên native, tránh kéo vào bundle web.
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new ApiError(result.status, `Xuất file thất bại (${result.status})`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
}
