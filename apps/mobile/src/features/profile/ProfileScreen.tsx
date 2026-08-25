import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppAvatar } from '@/components/AppAvatar';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonProfile } from '@/components/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useMeQuery } from '@/features/auth/api';
import { ApiError } from '@/lib/api/client';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import type { Role } from '@/types/api';

/** Không hiển thị enum backend trực tiếp (CLAUDE.md §19). */
const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Quản trị viên', TEAM_LEAD: 'Tổ trưởng' };

/** Màn 10 "Hồ sơ" (artboard "10 · Hồ sơ", docs/plans/0022-profile-8-screens-plan.md) — thay hẳn wireframe
 * cũ. Route chính của tab Hồ sơ. */
export function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const query = useMeQuery(isAuthenticated);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Lỗi network trần (fetch throw Error thường, không phải ApiError — xem lib/api/client.ts) coi là
  // dấu hiệu offline (màn 17 "Trạng thái tải/lỗi/offline" — banner nhẹ thay vì full ErrorState chặn hết
  // màn, vì rất có thể chỉ là mất sóng tạm thời lúc Admin đi thực địa, CLAUDE.md §9).
  const isOffline = query.isError && !(query.error instanceof ApiError);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
    >
      <VStack space="md">
        <AppHeading size="xl">Hồ sơ</AppHeading>

        {isOffline ? (
          <Box className="rounded-lg bg-muted px-3 py-2">
            <AppText size="sm" className="text-muted-foreground">
              Đang offline · hiển thị dữ liệu đã lưu gần nhất
            </AppText>
          </Box>
        ) : null}

        {query.isLoading ? <SkeletonProfile /> : null}
        {query.isError && !isOffline ? (
          <ErrorState
            message="Không thể tải thông tin hồ sơ."
            detail={query.error instanceof ApiError ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : null}

        {query.data ? (
          <VStack space="md">
            <Box className="items-center rounded-xl border border-border bg-card p-4">
              <AppAvatar fullName={query.data.fullName} photoUrl={query.data.avatarUrl} size={80} />
              <AppText size="lg" className="mt-3 font-semibold">
                {query.data.fullName}
              </AppText>
              <AppText size="sm" className="text-muted-foreground">
                {ROLE_LABEL[query.data.role]}
              </AppText>
              <AppButton
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onPress={() => router.push('/profile/edit')}
              >
                Chỉnh sửa hồ sơ
              </AppButton>
            </Box>

            <VStack space="xs">
              <AppText size="xs" className="px-1 font-semibold uppercase text-muted-foreground">
                Tài khoản
              </AppText>
              <Box className="rounded-xl border border-border bg-card">
                <MenuRow
                  title="Thông tin cá nhân"
                  subtitle={[query.data.email, query.data.phone].filter(Boolean).join(' · ')}
                  onPress={() => router.push('/profile/edit')}
                />
                <RowDivider />
                <MenuRow title="Đổi mật khẩu" onPress={() => router.push('/profile/change-password')} last />
              </Box>
            </VStack>

            <VStack space="xs">
              <AppText size="xs" className="px-1 font-semibold uppercase text-muted-foreground">
                Ứng dụng &amp; hỗ trợ
              </AppText>
              <Box className="rounded-xl border border-border bg-card">
                <MenuRow title="Thiết lập ứng dụng" onPress={() => router.push('/profile/settings')} />
                <RowDivider />
                <MenuRow title="Thông tin ứng dụng" onPress={() => router.push('/profile/about')} />
                <RowDivider />
                {/* Trợ giúp/Điều khoản: chưa có yêu cầu nội dung cụ thể — điều hướng tạm về màn Thông tin
                    ứng dụng (đã có link Chính sách/Điều khoản ở đó) thay vì route chết không làm gì khi
                    bấm. TODO: tách route riêng khi có nội dung thật. */}
                <MenuRow title="Trợ giúp" onPress={() => router.push('/profile/about')} />
                <RowDivider />
                <MenuRow title="Điều khoản & chính sách" onPress={() => router.push('/profile/about')} last />
              </Box>
            </VStack>

            {/* AppButton không cho tùy biến màu chữ theo variant (chỉ Root nhận className, ButtonText
                theo context variant cố định — xem components/ui/button/index.tsx) — dùng Pressable trần
                để khớp đúng nút "outline nhưng chữ+viền đỏ" trong mockup, KHÔNG có sẵn variant nào đủ. */}
            <Pressable onPress={() => setLogoutOpen(true)}>
              <Box className="items-center rounded-md border border-destructive px-4 py-3">
                <AppText className="font-medium text-destructive">Đăng xuất</AppText>
              </Box>
            </Pressable>
          </VStack>
        ) : null}

        <AppText size="xs" className="text-center text-muted-foreground">
          {`David Dũng · Phiên bản ${Constants.expoConfig?.version ?? '1.0.0'}`}
        </AppText>
      </VStack>

      <LogoutConfirmDialog
        visible={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
      />
    </ScrollView>
  );
}

function MenuRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Chỉ dùng để đọc code rõ ràng ở chỗ gọi (hàng cuối không cần RowDivider theo sau) — không ảnh hưởng style. */
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <Box className="flex-row items-center justify-between px-4 py-3">
        <VStack space="xs" className="flex-1 pr-2">
          <AppText>{title}</AppText>
          {subtitle ? (
            <AppText size="xs" className="text-muted-foreground">
              {subtitle}
            </AppText>
          ) : null}
        </VStack>
        <AppText className="text-muted-foreground">›</AppText>
      </Box>
    </Pressable>
  );
}

function RowDivider() {
  return <Box className="h-px bg-border" style={{ marginLeft: 16 }} />;
}
