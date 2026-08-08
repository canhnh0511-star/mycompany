import { ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  /** Đường dẫn tới ADR/feature liên quan — để biết đọc gì trước khi bắt tay code màn này thật. */
  reference?: string;
}

/**
 * Khung tạm cho các màn hình CHƯA build (chờ wireframe chốt layout thật — xem
 * docs/frontend-grilling-plan.md §5). Route đã dựng đúng chỗ theo cấu trúc §3 để feature code sau này
 * chỉ cần thay nội dung file, không phải dựng lại route/navigation.
 */
export function PlaceholderScreen({ title, description, reference }: PlaceholderScreenProps) {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="sm">
        <AppHeading size="xl">{title}</AppHeading>
        <AppText className="text-muted-foreground">{description}</AppText>
        {reference ? (
          <AppText size="xs" className="text-muted-foreground">
            Xem: {reference}
          </AppText>
        ) : null}
      </VStack>
    </ScrollView>
  );
}
