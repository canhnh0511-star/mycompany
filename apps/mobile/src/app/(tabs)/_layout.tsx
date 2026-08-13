import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

/**
 * Navigation refactor (Phase 3, module-1-1-frontend-redesign) — ĐỔI LẠI 2026-08-13 sau khi user tự
 * test simulator: quay về đúng Claude Design 1a (5 cột, nút "Chụp" nổi bật ở giữa) thay vì bản 4 cột
 * phẳng trước đó (quyết định Phase 3 cũ đã bị chính Product Owner override — không phải tôi tự ý làm
 * lại, xem `docs/module-1-1-frontend-redesign-progress.md`).
 *
 * Thanh tab tự vẽ (`tabBar` prop, KHÔNG dùng default renderer) vì cần chèn 1 nút to hơn (64×52) ở giữa
 * — default `Tabs.Screen` renderer của react-navigation không hỗ trợ item khác kích thước trong cùng
 * hàng. Nút "Chụp" ở giữa KHÔNG phải 1 tab/route thật (không có screen tương ứng) — chỉ điều hướng
 * `router.push('/(tabs)/capture')`, giống hệt CTA "Chụp phiếu" trên Home.
 *
 * Điều hướng bằng `router.push(path)` (expo-router file-path), KHÔNG dùng `navigation.navigate(name)`
 * của react-navigation — đã thử và bị lỗi "action NAVIGATE ... was not handled" với route trong thư
 * mục con (`profile/index.tsx`, `lookup/index.tsx`): tên route nội bộ không khớp `name` khai báo ở
 * `Tabs.Screen`. `router.push` dùng path thật, cùng cơ chế đã hoạt động ổn định ở mọi nơi khác trong
 * app (Home, Capture...) — an toàn hơn. Trạng thái "đang chọn" đọc từ `usePathname()` thay vì
 * `state.index`, cùng pattern `(web)/_layout.tsx` đã dùng.
 *
 * Icon: Claude Design gốc chỉ dùng khối vuông bo góc làm placeholder (không phải icon set thật, xem
 * mockup `Nông trường cao su - Mobile.dc.html`) — giữ đúng y vậy thay vì tự chọn icon rời rạc không có
 * trong design, cũng né được lỗi font icon bị vỡ (tofu box) đang gặp trên build hiện tại.
 *
 * `capture`/`quick-entry` vẫn là route thật (Phase 3 cũ) — chỉ ẩn khỏi tabBar mặc định, không xóa.
 */
function TabIcon({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center pt-2.5">
      <VStack space="xs" className="items-center">
        <Box
          className={`w-[18px] h-[18px] rounded-[5px] ${active ? 'bg-primary' : 'border-[1.5px] border-muted-foreground'}`}
        />
        <AppText size="xs" className={active ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}>
          {label}
        </AppText>
      </VStack>
    </Pressable>
  );
}

function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isPhieu = pathname.startsWith('/phieu');
  const isLookup = pathname.startsWith('/lookup');
  const isProfile = pathname.startsWith('/profile');

  return (
    <HStack className="bg-background border-t border-border" style={{ paddingBottom: insets.bottom }}>
      <TabIcon label="Hôm nay" active={isHome} onPress={() => router.push('/(tabs)')} />
      <TabIcon label="Phiếu" active={isPhieu} onPress={() => router.push('/(tabs)/phieu')} />
      <Pressable onPress={() => router.push('/(tabs)/capture')} className="flex-1 items-center pt-2.5">
        <Box className="w-16 h-[52px] rounded-xl bg-primary items-center justify-center">
          <AppText size="sm" className="text-primary-foreground font-semibold">
            Chụp
          </AppText>
        </Box>
      </Pressable>
      <TabIcon label="Sản lượng" active={isLookup} onPress={() => router.push('/(tabs)/lookup')} />
      <TabIcon label="Hồ sơ" active={isProfile} onPress={() => router.push('/(tabs)/profile')} />
    </HStack>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <CustomTabBar />}>
      <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
      <Tabs.Screen name="phieu" options={{ title: 'Phiếu' }} />
      <Tabs.Screen name="lookup" options={{ title: 'Sản lượng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="quick-entry" options={{ href: null }} />
    </Tabs>
  );
}
