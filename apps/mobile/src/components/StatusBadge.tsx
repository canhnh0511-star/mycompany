import { Box } from '@/components/ui/box';
import { AppText } from '@/components/AppText';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const TONE_BG: Record<StatusTone, string> = {
  neutral: 'bg-muted',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  error: 'bg-destructive',
  info: 'bg-info/15',
};

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-white',
  info: 'text-info',
};

export interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

/**
 * Badge trạng thái dùng chung (ADR-0015, CLAUDE.md §19 "status phải nhất quán toàn hệ thống" —
 * KHÔNG hiển thị enum backend trực tiếp, nhãn tiếng Việt truyền vào qua `label`). Chỉ là presentational
 * — mapping enum nghiệp vụ → { label, tone } nằm ở `lib/status.ts` (RecordStatus) hoặc riêng theo màn
 * (OCR confidence state ✓/⚠/lỗi ở Phase 6), không hardcode ở đây để component này dùng lại được cho
 * bất kỳ loại status nào.
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Box className={`self-start rounded-full px-2 py-0.5 ${TONE_BG[tone]} ${className ?? ''}`}>
      <AppText size="xs" className={`font-medium ${TONE_TEXT[tone]}`}>
        {label}
      </AppText>
    </Box>
  );
}
