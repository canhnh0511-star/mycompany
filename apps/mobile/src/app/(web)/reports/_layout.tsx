import { Link, Slot, usePathname } from 'expo-router';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

const NAV_ITEMS = [
  { href: '/reports/production-records' as const, label: 'Sản lượng cá nhân' },
  { href: '/reports/latex-sales' as const, label: 'Bán mủ theo Tổ' },
  { href: '/reports/ocr-monitoring' as const, label: 'Theo dõi OCR' },
];

/**
 * Layout dùng chung cho nhóm "Báo cáo" — rail con bên trái điều hướng, cùng pattern
 * `(web)/admin-catalog/_layout.tsx` (ADR-0019 mục 3, áp dụng lại cho Tuần 6: Admin hay bấm qua lại
 * giữa 2 báo cáo + màn Theo dõi OCR lúc đối chiếu chi phí/sản lượng cùng lúc).
 */
export default function ReportsLayout() {
  const pathname = usePathname();

  return (
    <HStack className="flex-1 bg-background">
      <VStack className="w-48 border-r border-border p-2" space="xs">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable>
                <Box className={`rounded-md px-3 py-2 ${active ? 'bg-accent' : ''}`}>
                  <AppText size="sm">{item.label}</AppText>
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
