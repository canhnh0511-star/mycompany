import { Tabs } from 'expo-router';

/**
 * 4 tab chính (CLAUDE.md §5) — dùng `Tabs` chuẩn của expo-router (KHÔNG dùng
 * `expo-router/unstable-native-tabs` mà create-expo-app tạo sẵn) để hành vi nhất quán giữa Native và
 * Web (CLAUDE.md §3: "1 codebase cho iOS/Android/Web") thay vì phụ thuộc API còn "unstable".
 * "Chụp ảnh" là tab mặc định khi mở app — xếp đầu tiên.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="capture" options={{ title: 'Chụp ảnh' }} />
      <Tabs.Screen name="quick-entry" options={{ title: 'Nhập tay nhanh' }} />
      <Tabs.Screen name="lookup" options={{ title: 'Tra cứu' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
