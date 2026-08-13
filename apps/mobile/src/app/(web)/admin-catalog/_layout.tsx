import { Link, Slot, usePathname } from 'expo-router';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

const NAV_ITEMS = [
  { href: '/admin-catalog/teams' as const, label: 'Tổ' },
  { href: '/admin-catalog/employees' as const, label: 'Nhân viên' },
  { href: '/admin-catalog/latex-types' as const, label: 'Loại mủ' },
  { href: '/admin-catalog/rate-configs' as const, label: 'Đơn giá' },
  { href: '/admin-catalog/allowance-configs' as const, label: 'Phụ cấp' },
];

/**
 * Layout dùng chung cho 5 màn danh mục — rail con bên trái điều hướng, nội dung bên phải qua `<Slot />`
 * (ADR-0019 mục 3: 1 trang dùng chung thay vì 5 route rời có nav top). `Teams` từng build trước khi có
 * wireframe với route độc lập — giờ tự động thừa hưởng layout này vì route con nằm trong nhóm
 * `admin-catalog/`, không cần sửa `TeamsScreen.tsx`.
 */
export default function AdminCatalogLayout() {
  const pathname = usePathname();

  return (
    <HStack className="flex-1 bg-background">
      <VStack className="w-48 border-r border-border p-2" space="xs">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable>
                <Box className={`rounded-md px-3 py-2 ${active ? 'bg-primary/10' : ''}`}>
                  <AppText size="sm" className={active ? 'text-primary font-medium' : undefined}>
                    {item.label}
                  </AppText>
                </Box>
              </Pressable>
            </Link>
          );
        })}
      </VStack>
      <Box className="flex-1">
        <Slot />
      </Box>
    </HStack>
  );
}
