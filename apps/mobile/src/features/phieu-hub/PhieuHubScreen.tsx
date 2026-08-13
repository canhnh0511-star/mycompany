import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';

/**
 * Tab "Phiếu" — hub điều hướng, KHÔNG chứa business logic (Phase 3, module-1-1-frontend-redesign).
 * Gộp lối vào "Chụp ảnh" + "Nhập tay nhanh" (2 tab riêng trước đây) thành 1 chỗ theo quyết định Product
 * Owner (điều hướng lại vị trí, KHÔNG xóa chức năng — xem bảng mapping trong
 * docs/module-1-1-frontend-redesign-progress.md Phase 3). 2 route đích (`(tabs)/capture`,
 * `(tabs)/quick-entry`) giữ NGUYÊN file/logic, chỉ ẩn khỏi thanh tab (`href: null` ở `_layout.tsx`) —
 * vẫn điều hướng tới được từ đây lẫn từ CTA trên Home.
 */
export function PhieuHubScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <AppHeading size="xl">Phiếu</AppHeading>

        <Pressable onPress={() => router.push('/(tabs)/capture')}>
          <AppCard className="bg-primary border-primary">
            <AppText className="font-semibold text-primary-foreground" size="lg">
              Chụp phiếu
            </AppText>
            <AppText className="text-primary-foreground/80 mt-1" size="sm">
              Chụp ảnh sổ ghi mủ / sổ bán mủ — AI đọc tự động, xác nhận lại trước khi lưu.
            </AppText>
          </AppCard>
        </Pressable>

        <Pressable onPress={() => router.push('/(tabs)/quick-entry')}>
          <AppCard>
            <AppText className="font-semibold" size="lg">
              Nhập tay nhanh
            </AppText>
            <AppText className="text-muted-foreground mt-1" size="sm">
              Nhập/sửa sản lượng, bán mủ, chuyên cần trực tiếp trên điện thoại.
            </AppText>
          </AppCard>
        </Pressable>
      </VStack>
    </ScrollView>
  );
}
