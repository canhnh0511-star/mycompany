import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Platform, Pressable as RNPressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { useAppToast } from '@/components/useAppToast';
import { biometrics } from '@/lib/auth/biometrics';
import { credentialStorage } from '@/lib/auth/credentialStorage';
import { clearCache, formatBytes, getCacheSizeBytes } from '@/lib/settings/cacheCleanup';
import { useSettingsStore } from '@/features/settings/store';
import type { ModeType } from '@/components/ui/gluestack-ui-provider';

const THEME_LABEL: Record<ModeType, string> = { light: 'Sáng', dark: 'Tối', system: 'Theo hệ thống' };

/**
 * Màn 14 "Thiết lập ứng dụng" — chỉ phần MUST (Giao diện/Ngôn ngữ/Xóa dữ liệu tạm), xem
 * docs/plans/0022-profile-8-screens-plan.md phase 2. "Cỡ chữ"/"Chất lượng ảnh gửi lên" (SHOULD) và
 * "Chỉ gửi khi có Wi-Fi" (BỎ hẳn — xung đột ADR-0005) chưa/không làm ở đây.
 *
 * Nhóm "BẢO MẬT" (Face ID/vân tay) KHÔNG có trong mockup gốc — đây là tính năng đã tồn tại từ trước khi
 * redesign (wireframe `ProfileScreen` cũ có nút "Tắt đăng nhập bằng Face ID / vân tay"), chuyển xuống
 * đây thay vì xóa mất khi thay UI, vì không có màn nào khác trong 8 màn mới thay thế đúng chức năng này.
 *
 * BUG THẬT sửa 2026-08-25 (user báo cáo): nhãn "Tắt đăng nhập bằng Face ID / vân tay" hiện ra chỉ dựa
 * vào `credentialStorage.hasSavedCredentials()` — CHƯA kiểm tra `biometrics.isAvailable()` (cần cả
 * `hasHardwareAsync()` VÀ `isEnrolledAsync()`, xem `lib/auth/biometrics.ts`). `hasSavedCredentials()`
 * đúng cả khi mật khẩu chỉ được lưu qua checkbox "Ghi nhớ mật khẩu" ở màn đăng nhập (KHÔNG liên quan
 * Face ID) — trên máy/emulator không có cảm biến sinh trắc học (hoặc chưa đăng ký vân tay/khuôn mặt),
 * màn Đăng nhập (`login.tsx`, `canUseBiometric = biometrics.isAvailable() && hasSavedCredentials()`)
 * đúng đắn KHÔNG hiện nút sinh trắc học, nhưng màn Thiết lập vẫn hiện nhãn "Face ID/vân tay" gây hiểu
 * lầm nút này tồn tại. Sửa: đọc thêm `biometrics.isAvailable()`, đổi nhãn theo đúng thực tế — còn
 * sinh trắc học thật thì giữ nhãn cũ, không thì đổi thành "Xóa mật khẩu đã ghi nhớ" (đúng bản chất dữ
 * liệu đang xóa).
 */
export function AppSettingsScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  useEffect(() => {
    getCacheSizeBytes().then(setCacheBytes);
    credentialStorage.hasSavedCredentials().then(setHasSavedCredentials);
    biometrics.isAvailable().then(setCanUseBiometric);
  }, []);

  async function handleClearCache() {
    setClearing(true);
    try {
      await clearCache();
      setCacheBytes(0);
      showToast({ title: 'Đã xóa dữ liệu tạm', variant: 'success' });
    } catch {
      showToast({ title: 'Không xóa được dữ liệu tạm', variant: 'error' });
    } finally {
      setClearing(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <AppText size="sm" className="text-primary">
            ‹ Hồ sơ
          </AppText>
        </Pressable>
        <AppHeading size="xl">Thiết lập</AppHeading>

        <SettingsGroup title="Hiển thị">
          <SettingsRow title="Giao diện" value={THEME_LABEL[theme]} onPress={() => setThemeSheetOpen(true)} />
        </SettingsGroup>

        <SettingsGroup title="Khác">
          <SettingsRow title="Ngôn ngữ" value="Tiếng Việt" />
          <RowDivider />
          <Box className="flex-row items-center justify-between px-4 py-3">
            <VStack space="xs">
              <AppText>Xóa dữ liệu tạm</AppText>
              <AppText size="xs" className="text-muted-foreground">
                Ảnh nháp/tải tạm trên máy · {cacheBytes == null ? 'đang tính...' : formatBytes(cacheBytes)}
              </AppText>
            </VStack>
            <Pressable onPress={handleClearCache} disabled={clearing || !cacheBytes}>
              <AppText className="font-medium text-primary">{clearing ? 'Đang xóa...' : 'Xóa'}</AppText>
            </Pressable>
          </Box>
        </SettingsGroup>

        {/* Xem javadoc đầu file (mục "BUG THẬT sửa 2026-08-25") — nhãn đổi theo đúng thực tế thiết bị,
            không gắn cứng "Face ID/vân tay" khi máy không có/chưa đăng ký cảm biến. */}
        {Platform.OS !== 'web' && hasSavedCredentials ? (
          <SettingsGroup title="Bảo mật">
            <Box className="px-4 py-3">
              <Pressable
                onPress={async () => {
                  await credentialStorage.clearCredentials();
                  setHasSavedCredentials(false);
                  showToast({
                    title: canUseBiometric ? 'Đã tắt đăng nhập bằng Face ID / vân tay' : 'Đã xóa mật khẩu đã ghi nhớ',
                    variant: 'success',
                  });
                }}
              >
                <AppText className="text-destructive">
                  {canUseBiometric ? 'Tắt đăng nhập bằng Face ID / vân tay' : 'Xóa mật khẩu đã ghi nhớ'}
                </AppText>
              </Pressable>
            </Box>
          </SettingsGroup>
        ) : null}

        <AppText size="xs" className="text-muted-foreground">
          Cấu hình nghiệp vụ (nhân viên, tổ, loại mủ, quy tắc OCR) không nằm ở đây — thuộc khu quản trị
          riêng.
        </AppText>
      </VStack>

      <Modal visible={themeSheetOpen} transparent animationType="fade" onRequestClose={() => setThemeSheetOpen(false)}>
        <RNPressable
          onPress={() => setThemeSheetOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
        >
          <RNPressable onPress={() => {}}>
            <Box className="rounded-xl bg-card p-4">
              <VStack space="xs">
                {(['light', 'dark', 'system'] as ModeType[]).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setTheme(mode);
                      setThemeSheetOpen(false);
                    }}
                  >
                    <Box className="flex-row items-center justify-between rounded-lg px-4 py-3">
                      <AppText className={mode === theme ? 'font-semibold text-primary' : ''}>
                        {THEME_LABEL[mode]}
                      </AppText>
                      {mode === theme ? <AppText className="text-primary">✓</AppText> : null}
                    </Box>
                  </Pressable>
                ))}
              </VStack>
            </Box>
          </RNPressable>
        </RNPressable>
      </Modal>
    </ScrollView>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack space="xs">
      <AppText size="xs" className="px-1 font-semibold uppercase text-muted-foreground">
        {title}
      </AppText>
      <Box className="rounded-xl border border-border bg-card">{children}</Box>
    </VStack>
  );
}

function SettingsRow({ title, value, onPress }: { title: string; value: string; onPress?: () => void }) {
  const content = (
    <Box className="flex-row items-center justify-between px-4 py-3">
      <AppText>{title}</AppText>
      <AppText className="text-muted-foreground">
        {value}
        {onPress ? '  ›' : ''}
      </AppText>
    </Box>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

function RowDivider() {
  return <Box className="h-px bg-border" style={{ marginLeft: 16 }} />;
}
