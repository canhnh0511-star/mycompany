import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';

export interface EmptyStateProps {
  /** Vd "Hôm nay chưa có phiếu ghi mủ." — UI_UX_GUIDE_RUBBER_FARM.md §20: không chỉ "Không có dữ liệu". */
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty state dùng chung — luôn có chỗ cho CTA hướng hành động tiếp theo (UI_UX_GUIDE §20, mục 30 tài
 * liệu upgrade). `actionLabel`/`onAction` là optional vì không phải empty state nào cũng có hành động
 * rõ ràng tiếp theo (vd "Không có bản ghi nào khớp bộ lọc" chỉ cần đổi bộ lọc, không cần CTA).
 */
export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <VStack space="sm" className="items-center py-6">
      <AppText className="text-center text-muted-foreground">{message}</AppText>
      {actionLabel && onAction ? (
        <AppButton variant="outline" onPress={onAction}>
          {actionLabel}
        </AppButton>
      ) : null}
    </VStack>
  );
}
