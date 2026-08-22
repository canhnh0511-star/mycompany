import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { queryClient } from '@/lib/query/queryClient';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/store';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

/**
 * Gác cổng auth cho toàn app — pattern chuẩn của Expo Router (chưa dùng `Stack.Protected`, xem
 * ADR-0016 lý do route-guard tối thiểu ở v1). 2 việc:
 * 1. Hydrate token đã lưu (nếu có) lúc mở app, ẩn splash screen khi xong.
 * 2. Điều hướng theo `status`: chưa đăng nhập → (auth)/login; đã đăng nhập mà còn đứng ở (auth) →
 *    (tabs) — tab "Hôm nay" (Home), tab mặc định mới sau navigation refactor Phase 3
 *    (module-1-1-frontend-redesign, quyết định Product Owner 2026-08-13; trước đó là (tabs)/capture,
 *    CLAUDE.md §5 bản gốc). Cũng là nơi đăng ký handler 401 tập trung của apiClient (ADR-0009) — đặt ở
 *    đây vì cần `useRouter()`, apiClient không có quyền truy cập router.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync());
  }, [hydrate]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      router.replace('/(auth)/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, router]);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    // segments.length === 0 = đang đứng ở route trung chuyển "/" (app/index.tsx, chỉ có Spinner) —
    // PHẢI coi như "chưa vào group nào" giống inAuthGroup, không chỉ xử lý riêng (auth). Thiếu nhánh
    // này khiến user đã authenticated nhưng router chưa kịp resolve route ban đầu bị kẹt mãi ở màn
    // Spinner trung chuyển, không bao giờ redirect sang (tabs) — phát hiện khi test thật trên iPhone
    // qua Expo Go (2026-08-16), full app bug có sẵn từ trước, không liên quan SDK 54.
    // `useSegments()` gõ kiểu tuple cố định theo route đã khai báo (typedRoutes) nên TS tưởng
    // `segments.length` không bao giờ là 0 — nhưng thực tế runtime CÓ trường hợp này (route trung
    // chuyển "/"), ép kiểu về mảng string trần để so sánh đúng thực tế.
    const atRoot = (segments as readonly string[]).length === 0;
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && (inAuthGroup || atRoot)) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return <>{children}</>;
}

/**
 * `edges={['top']}` — Android SDK 57 (targetSdk 35+) ép edge-to-edge, status bar luôn translucent, app
 * PHẢI tự chừa inset trên cho toàn bộ route (không riêng gì 1 màn) — phát hiện khi user tự test build
 * thật trên thiết bị (2026-08-13), tất cả header đều bị đồng hồ/status bar đè lên. Chừa 1 lần ở gốc
 * thay vì sửa từng `ScrollView`/màn hình riêng lẻ (~20 file). KHÔNG chừa `bottom` ở đây — tab bar tự lo
 * `insets.bottom` riêng (`(tabs)/_layout.tsx`), các Stack route full-screen khác (login, scan-batch-review...)
 * đã đứng trên nền sáng chạm đáy màn hình bình thường, không bị report lỗi.
 */
/**
 * Font "Inter" — Claude Design dùng Inter cho toàn bộ UI (400/500/600), app trước đó KHÔNG load font
 * nào cả nên rơi về font hệ thống (Roboto/San Francisco) — phát hiện khi user tự test build thật, thấy
 * chữ "bold quá" (headingStyle base cũ hardcode `font-bold`=700, trong khi Claude Design chỉ dùng tối đa
 * 600/SemiBold, không có chỗ nào 700) + sai cả typeface (2026-08-13).
 *
 * Chỉ load 3 weight design thực sự dùng (Regular/Medium/SemiBold — không có Bold 700) để giữ bundle
 * nhỏ. Splash screen (`preventAutoHideAsync` ở trên) tự động vẫn hiện tới khi `fontsLoaded` xong vì
 * `RootLayout` return `null` bên dưới — `AuthGate` (nơi gọi `hideAsync`) chưa kịp mount.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GluestackUIProvider mode="system">
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaView>
        </AuthGate>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
