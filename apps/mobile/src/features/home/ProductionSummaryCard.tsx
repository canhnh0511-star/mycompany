import { useWindowDimensions, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { LATEX_TYPE_ICONS } from './HomeIcons';
import type { LatexTypeKg } from '@/types/api';

// Ngưỡng bề ngang chuyển layout 2 cột — dưới ngưỡng này (điện thoại nhỏ, iPhone SE/Android compact)
// xếp dọc để tránh "kg xuống dòng một mình"/text bị bóp (mục 11 yêu cầu — Responsive).
const TWO_COLUMN_MIN_WIDTH = 380;

/**
 * Card "Sản lượng ghi nhận" — tổng + trend + breakdown theo loại mủ (Đợt 4 Home redesign, 2026-08-25).
 * Nguồn dữ liệu breakdown: `GET /production-summary/daily` (`byLatexType`, đã có sẵn từ Phase 4/5 Spec
 * 2 — KHÔNG cần API mới). Tổng/trend VẪN lấy từ nguồn cũ (`productionReport`/`dailyTrend` report API,
 * xem HomeScreen.tsx) — không đổi để giữ đúng hành vi/số liệu hiện có, chỉ ghép thêm breakdown bên cạnh.
 *
 * DRC trung bình KHÔNG hiển thị — không có ở bất kỳ endpoint tổng hợp nào (chỉ có DRC từng dòng nhân
 * viên trong TeamBreakdownResponse, không phải số tổng hợp toàn công ty/ngày); user xác nhận 2026-08-25
 * bỏ qua thay vì thêm field backend mới ở lần sửa này.
 */
export function ProductionSummaryCard({
  totalKg,
  trendPercent,
  byLatexType,
}: {
  totalKg: number;
  trendPercent: number | null;
  byLatexType: LatexTypeKg[];
}) {
  const { width } = useWindowDimensions();
  const isTwoColumn = width >= TWO_COLUMN_MIN_WIDTH;

  const totalBlock = (
    <VStack space="xs" style={isTwoColumn ? { flex: 1, paddingRight: 12 } : undefined}>
      <AppText size="sm" className="text-muted-foreground">
        Sản lượng ghi nhận
      </AppText>
      <HStack className="items-baseline" space="xs">
        <AppText size="2xl" className="font-semibold font-mono">
          {totalKg.toLocaleString('vi-VN')}
        </AppText>
        <AppText className="text-muted-foreground">kg</AppText>
      </HStack>
      {trendPercent != null ? (
        <AppText size="sm" className={trendPercent >= 0 ? 'text-success' : 'text-destructive'}>
          {`${trendPercent >= 0 ? '↑' : '↓'} ${Math.abs(trendPercent).toFixed(1)}% so với TB 7 ngày`}
        </AppText>
      ) : (
        <AppText size="sm" className="text-muted-foreground">
          Chưa đủ dữ liệu so sánh
        </AppText>
      )}
    </VStack>
  );

  const breakdownBlock = (
    <VStack space="sm" style={isTwoColumn ? { flex: 1, paddingLeft: 12 } : undefined}>
      {byLatexType.map((item) => {
        const Icon = LATEX_TYPE_ICONS[item.code];
        return (
          <HStack key={item.code} className="items-center justify-between">
            <HStack space="xs" className="items-center">
              {Icon ? <Icon /> : null}
              <AppText size="sm">{item.label}</AppText>
            </HStack>
            <AppText size="sm" className="font-mono font-medium">
              {`${item.kg.toLocaleString('vi-VN')} kg`}
            </AppText>
          </HStack>
        );
      })}
    </VStack>
  );

  return (
    <AppCard className="rounded-2xl">
      {isTwoColumn ? (
        <HStack>
          {totalBlock}
          <Box className="w-px bg-border" />
          {breakdownBlock}
        </HStack>
      ) : (
        <VStack space="md">
          {totalBlock}
          <View style={{ height: 1 }} className="bg-border" />
          {breakdownBlock}
        </VStack>
      )}
    </AppCard>
  );
}
