import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useMeQuery } from '@/features/auth/api';
import { credentialStorage } from '@/lib/auth/credentialStorage';

/**
 * Duy nhất trong 4 tab đã nối API thật (GET /users/me) ngay từ scaffold — dùng để xác nhận cả chuỗi
 * apiClient → TanStack Query → auth store hoạt động đúng trước khi build các tab còn lại. Đổi mật khẩu
 * (PATCH /users/me/password) để lại cho đợt build UI thật sau wireframe.
 */
export default function ProfileScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { data, isLoading, isError } = useMeQuery(isAuthenticated);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  useEffect(() => {
    credentialStorage.hasSavedCredentials().then(setHasSavedCredentials);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <VStack space="md" className="w-full max-w-sm items-center">
        <AppHeading size="xl">Hồ sơ</AppHeading>

        {isLoading ? <Spinner /> : null}
        {isError ? (
          <AppText className="text-destructive">Không tải được thông tin tài khoản.</AppText>
        ) : null}
        {data ? (
          <VStack space="xs" className="items-center">
            <AppText size="lg">{data.fullName}</AppText>
            <AppText className="text-muted-foreground">{data.email}</AppText>
            <AppText size="sm" className="text-muted-foreground">
              {data.role}
            </AppText>
          </VStack>
        ) : null}

        {/* Face ID chỉ có ý nghĩa native (features/auth/store.ts loginWithBiometrics) — ẩn hẳn ở web
            thay vì hiện nút vô nghĩa. */}
        {Platform.OS !== 'web' && hasSavedCredentials ? (
          <AppButton
            variant="outline"
            size="sm"
            onPress={async () => {
              await credentialStorage.clearCredentials();
              setHasSavedCredentials(false);
            }}
          >
            Tắt đăng nhập bằng Face ID / vân tay
          </AppButton>
        ) : null}

        <AppButton variant="outline" onPress={() => logout()}>
          Đăng xuất
        </AppButton>
      </VStack>
    </View>
  );
}
