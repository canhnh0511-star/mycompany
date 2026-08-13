import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { ApiError } from '@/lib/api/client';

/** Rút gọn `error instanceof ApiError ? error.message : 'Lỗi không xác định'` — pattern lặp lại ở
 * nhiều màn (`LookupScreen.tsx`, `OcrMonitoringScreen.tsx`, `ProductionReportScreen.tsx`...). */
export function getErrorMessage(error: unknown, fallback = 'Lỗi không xác định'): string {
  return error instanceof ApiError ? error.message : fallback;
}

export interface ErrorStateProps {
  /** Vd "Không thể xử lý ảnh." — điều gì xảy ra (CLAUDE.md §7/UI_UX_GUIDE §21). */
  message: string;
  /** Chi tiết kỹ thuật (thường lấy từ `getErrorMessage(error)`) — hiện phụ, không thay cho `message`. */
  detail?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Error state dùng chung — luôn có (1) điều gì xảy ra, (2) user nên làm gì (mục 21
 * UI_UX_GUIDE_RUBBER_FARM.md, mục 30 tài liệu upgrade). Không dùng "Something went wrong" chung chung.
 */
export function ErrorState({ message, detail, retryLabel = 'Thử lại', onRetry }: ErrorStateProps) {
  return (
    <VStack space="sm" className="items-center py-6">
      <AppText className="text-center text-destructive">{message}</AppText>
      {detail ? <AppText size="xs" className="text-center text-muted-foreground">{detail}</AppText> : null}
      {onRetry ? (
        <AppButton variant="outline" onPress={onRetry}>
          {retryLabel}
        </AppButton>
      ) : null}
    </VStack>
  );
}
