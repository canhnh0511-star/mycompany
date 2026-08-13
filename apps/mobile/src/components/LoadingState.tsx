import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { AppText } from '@/components/AppText';

export interface LoadingStateProps {
  label?: string;
}

/**
 * Loading state dùng chung — CHỈ cho khu vực/section đang tải, không chặn toàn màn hình (UI_UX_GUIDE
 * §28 "không block toàn app nếu chỉ một widget đang load"). Thay cho `<AppText>Đang tải...</AppText>`
 * lặp lại nhiều nơi (`LookupScreen.tsx`, `OcrMonitoringScreen.tsx`, `ProductionReportScreen.tsx`...).
 */
export function LoadingState({ label = 'Đang tải...' }: LoadingStateProps) {
  return (
    <HStack space="sm" className="items-center justify-center py-4">
      <Spinner />
      <AppText className="text-muted-foreground">{label}</AppText>
    </HStack>
  );
}
