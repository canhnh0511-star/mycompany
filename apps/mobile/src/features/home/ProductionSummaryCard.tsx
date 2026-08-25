import { useWindowDimensions, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { LATEX_TYPE_ICONS } from './HomeIcons';
import type { LatexTypeKg } from '@/types/api';

// Ngưỡng bề ngang chuyển layout 2 cột — dưới ngưỡng này (điện thoại nhỏ, iPhone SE/Android compact)
// xếp dọc để tránh "kg xuống dòng một mình"/text bị bóp (mục 31 yêu cầu — Responsive).
const TWO_COLUMN_MIN_WIDTH = 380;

// 4 loại mủ CỐ ĐỊNH (CLAUDE.md §4 — danh mục mở nhưng 4 loại này luôn tồn tại từ đầu) — dùng làm khung
// hiển thị, ghép dữ liệu thật từ `byLatexType` theo code, KHÔNG hardcode SỐ (kg) — chỉ hardcode nhãn +
// thứ tự hiển thị khi API không trả dòng đó (vd hôm nay total=0 → API trả `byLatexType: []` rỗng hoàn
// toàn), để breakdown vẫn hiện đủ 4 dòng với 0kg thay vì trống trơn (yêu cầu §11 "Data state khi bằng
// 0" — sửa đúng bug lần trước: card cũ chỉ `.map()` thẳng `byLatexType`, rỗng thì không render gì).
const LATEX_TYPE_ORDER = ['water', 'cup', 'strip', 'coagulated'] as const;
const LATEX_TYPE_FALLBACK_LABEL: Record<string, string> = {
  water: 'Mủ nước',
  cup: 'Mủ chén',
  strip: 'Mủ dây',
  coagulated: 'Mủ đông',
};

/**
 * Card "Sản lượng ghi nhận" — SỬA LẦN 2 (2026-08-25) theo góp ý "còn khoảng trắng lớn bên phải, chưa
 * phải breakdown thật sự". 2 thay đổi thật sự (không chỉ đổi màu/spacing):
 * 1. Breakdown giờ LUÔN đủ 4 dòng (kể cả 0kg) — ghép theo `LATEX_TYPE_ORDER` cố định thay vì map thẳng
 *    mảng API (mảng rỗng khi total=0 trước đây khiến cả cột phải trống trơn, đúng bug user chỉ ra).
 * 2. Thêm dòng "DRC TB" LỒNG NGAY DƯỚI "Mủ nước" (không phải 1 loại mủ ngang hàng — đúng §10) —
 *    **API GAP**: không có endpoint tổng hợp nào trả DRC trung bình toàn công ty/ngày (chỉ có DRC từng
 *    dòng nhân viên riêng lẻ trong `TeamBreakdownResponse`, xem `services/api/dto/EmployeeProductionRow`).
 *    TODO(backend): cần thêm `averageDrc` vào `ProductionSummaryDailyResponse` nếu muốn số thật — hiện
 *    hiện "—" (không phải "0%", tránh ngụ ý đã đo được DRC=0 — 2 ý nghĩa khác nhau), KHÔNG hardcode số.
 *
 * Nguồn dữ liệu breakdown: `GET /production-summary/daily` (`byLatexType`, có sẵn từ Phase 4/5 Spec 2).
 * Tổng/trend vẫn lấy từ nguồn cũ (`productionReport`/`dailyTrend`, xem HomeScreen.tsx) — không đổi hành
 * vi/số liệu hiện có.
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

  const byCode = new Map(byLatexType.map((item) => [item.code, item]));
  const rows = LATEX_TYPE_ORDER.map((code) => ({
    code,
    label: byCode.get(code)?.label ?? LATEX_TYPE_FALLBACK_LABEL[code],
    kg: byCode.get(code)?.kg ?? 0,
  }));

  const totalBlock = (
    <VStack space="xs" style={isTwoColumn ? { flex: 0.42, paddingRight: 12 } : undefined}>
      <AppText size="sm" className="text-muted-foreground">
        Sản lượng ghi nhận
      </AppText>
      <HStack className="items-baseline" space="xs">
        <AppText size="3xl" className="font-semibold font-mono">
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
    <VStack space="sm" style={isTwoColumn ? { flex: 0.58, paddingLeft: 12 } : undefined}>
      {rows.map((row) => {
        const Icon = LATEX_TYPE_ICONS[row.code];
        return (
          <VStack key={row.code} space="xs">
            <HStack className="items-center justify-between">
              <HStack space="xs" className="items-center">
                {Icon ? <Icon /> : null}
                <AppText size="sm">{row.label}</AppText>
              </HStack>
              <AppText size="sm" className="font-mono font-medium">
                {`${row.kg.toLocaleString('vi-VN')} kg`}
              </AppText>
            </HStack>
            {/* DRC TB — CHỈ dưới "Mủ nước", lồng thụt vào (không phải 1 loại mủ ngang hàng, đúng §10). */}
            {row.code === 'water' ? (
              <HStack className="items-center justify-between" style={{ paddingLeft: 22 }}>
                <AppText size="xs" className="text-muted-foreground">
                  DRC TB
                </AppText>
                <AppText size="xs" className="font-mono text-muted-foreground">
                  —
                </AppText>
              </HStack>
            ) : null}
          </VStack>
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
