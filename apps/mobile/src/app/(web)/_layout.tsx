import { Link, Slot, usePathname } from 'expo-router';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

const NAV_ITEMS = [
  { href: '/admin-catalog/teams' as const, prefix: '/admin-catalog', label: 'Quản lý danh mục' },
  { href: '/reports/production-records' as const, prefix: '/reports', label: 'Báo cáo & Theo dõi OCR' },
];

/**
 * Nhóm route ưu tiên layout rộng (bảng, form nhiều cột) — Admin dùng ở web/tablet văn phòng
 * (CLAUDE.md §5). "(web)" chỉ là quy ước thư mục, KHÔNG chặn truy cập trên mobile (Expo Router không
 * tách runtime theo route group — xem docs/frontend-grilling-plan.md §3).
 *
 * Top nav bar (thêm ở Tuần 6) — trước đó `admin-catalog`/`reports` chỉ vào được bằng gõ thẳng URL,
 * không có lối dẫn nào trong app. Đổi `<Stack>` sang `<Slot>` để chrome này giữ nguyên khi điều hướng
 * qua lại giữa 2 nhóm con (mỗi nhóm tự có rail layout riêng lồng bên trong, ADR-0019 mục 3).
 */
export default function WebLayout() {
  const pathname = usePathname();

  return (
    <VStack className="flex-1 bg-background">
      <HStack className="border-b border-border px-4 py-2 items-center" space="md">
        <AppText className="font-semibold">Quản trị</AppText>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.prefix);
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable>
                <Box className={`rounded-md px-3 py-1.5 ${active ? 'bg-accent' : ''}`}>
                  <AppText size="sm">{item.label}</AppText>
                </Box>
              </Pressable>
            </Link>
          );
        })}
      </HStack>
      <Box className="flex-1">
        <Slot />
      </Box>
    </VStack>
  );
}
