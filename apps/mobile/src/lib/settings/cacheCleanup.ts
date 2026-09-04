import { Platform } from 'react-native';

/**
 * Màn 14 "Thiết lập ứng dụng" — mục "Xóa dữ liệu tạm". Chỉ dọn `cacheDirectory` (ảnh crop tạm từ
 * `expo-image-manipulator`, ảnh tải về tạm từ `lib/api/download.ts`) — KHÔNG đụng `documentDirectory`
 * (không có dữ liệu nghiệp vụ nào ghi ở đó, toàn bộ record thật nằm trên backend). Web không có khái
 * niệm cache dir tương đương (trình duyệt tự quản lý) — trả 0/no-op.
 */
export async function getCacheSizeBytes(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const FileSystem = await import('expo-file-system/legacy');
  const dir = FileSystem.cacheDirectory;
  if (!dir) return 0;
  try {
    const names = await FileSystem.readDirectoryAsync(dir);
    let total = 0;
    for (const name of names) {
      const info = await FileSystem.getInfoAsync(`${dir}${name}`);
      if (info.exists && !info.isDirectory) {
        total += info.size ?? 0;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function clearCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  const FileSystem = await import('expo-file-system/legacy');
  const dir = FileSystem.cacheDirectory;
  if (!dir) return;
  const names = await FileSystem.readDirectoryAsync(dir);
  await Promise.all(
    names.map((name) => FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true })),
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
