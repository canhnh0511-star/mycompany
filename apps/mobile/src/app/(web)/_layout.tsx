import { Stack } from 'expo-router';

/**
 * Nhóm route ưu tiên layout rộng (bảng, form nhiều cột) — Admin dùng ở web/tablet văn phòng
 * (CLAUDE.md §5). "(web)" chỉ là quy ước thư mục, KHÔNG chặn truy cập trên mobile (Expo Router không
 * tách runtime theo route group — xem docs/frontend-grilling-plan.md §3).
 */
export default function WebLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
