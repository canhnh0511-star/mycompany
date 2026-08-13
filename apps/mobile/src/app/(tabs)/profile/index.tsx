import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/features/auth/useAuth';
import { useMeQuery } from '@/features/auth/api';
import { credentialStorage } from '@/lib/auth/credentialStorage';
import type { Role } from '@/types/api';

/** Không hiển thị enum backend trực tiếp (CLAUDE.md §19) — chỉ dùng ở đây, chưa cần tách file riêng. */
const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', team_lead: 'Tổ trưởng' };

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

        {isLoading ? <LoadingState label="Đang tải thông tin tài khoản..." /> : null}
        {isError ? <ErrorState message="Không tải được thông tin tài khoản." /> : null}
        {data ? (
          <VStack space="xs" className="items-center">
            <AppText size="lg">{data.fullName}</AppText>
            <AppText className="text-muted-foreground">{data.email}</AppText>
            <AppText size="sm" className="text-muted-foreground">
              {ROLE_LABEL[data.role]}
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
