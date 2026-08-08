import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';

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
 *    (tabs)/capture (tab mặc định, CLAUDE.md §5). Cũng là nơi đăng ký handler 401 tập trung của
 *    apiClient (ADR-0009) — đặt ở đây vì cần `useRouter()`, apiClient không có quyền truy cập router.
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
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/capture');
    }
  }, [status, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="system">
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
