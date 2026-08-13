import type { ComponentProps } from 'react';
import { Box } from '@/components/ui/box';

type BoxProps = ComponentProps<typeof Box>;

export interface AppCardProps extends BoxProps {
  /** Card nổi trên nền phụ (dùng khi card nằm trực tiếp trên `bg-background`, mặc định) hay nằm lồng
   * trong card khác (bớt shadow/border để tránh "card trong card" — CLAUDE.md/UI_UX_GUIDE §18/§27). */
  variant?: 'default' | 'flat';
}

/**
 * Card dùng chung (ADR-0015, UI_UX_GUIDE_RUBBER_FARM.md §27 "Card chỉ dùng khi thực sự gom 1 nhóm
 * thông tin"). Trước đây mỗi màn tự viết `className="border border-border rounded-md p-3"` riêng (vd
 * `LookupScreen.tsx`) — gộp về đây theo đúng token/spacing/radius đã chốt ở Phase 1 (bg-card, border
 * mảnh, radius 12px, không shadow nặng — mục 18 tài liệu upgrade "Border và Shadow").
 */
export function AppCard({ variant = 'default', className, ...props }: AppCardProps) {
  const base = variant === 'default' ? 'bg-card border border-border rounded-xl p-4' : 'rounded-xl p-3';
  return <Box className={`${base} ${className ?? ''}`} {...props} />;
}
