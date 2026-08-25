import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { batchStatusLabel, batchStatusTone } from '@/lib/status';
import { queryKeys } from '@/lib/query/queryClient';
import { scanBatchApi } from './api';

function formatDateVn(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Danh sách batch "chờ xử lý" (Home "Chờ kiểm tra", bấm khi có >1 batch — 1 batch thì mở thẳng
 * Batch Review, xem `HomeScreen.handlePendingBatchesPress`). Route riêng ngoài `(tabs)` — cùng pattern
 * `team-workday.tsx`/`scan-batch-review/[batchId].tsx`, không thêm vào thanh tab.
 *
 * Lý do có màn này (2026-08-25, sửa lần 2 sau khi user hỏi "bấm vào thì sao"): trước đây bấm "Chờ kiểm
 * tra" chỉ mở tab Sản lượng của ĐÚNG HÔM NAY — batch tồn đọng thường KHÔNG phải hôm nay (test thật: 3
 * batch tồn đọng đều từ ngày trước), Admin phải tự dò từng ngày. Màn này liệt kê THẲNG batch nào/ngày
 * nào/Tổ nào, bấm vào mở đúng batch đó luôn.
 */
export function PendingBatchesScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.scanBatches.pending,
    queryFn: () => scanBatchApi.pending(),
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
    >
      <VStack space="md">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
          <AppText size="sm" className="text-primary">
            ‹ Hôm nay
          </AppText>
        </Pressable>
        <AppHeading size="xl">Chờ kiểm tra</AppHeading>

        {query.isLoading ? <LoadingState label="Đang tải danh sách..." /> : null}
        {query.isError ? (
          <ErrorState message="Không tải được danh sách." detail={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : null}

        {!query.isLoading && !query.isError && query.data ? (
          query.data.length === 0 ? (
            <EmptyState message="Không còn batch nào chờ xử lý." />
          ) : (
            <VStack space="sm">
              {query.data.map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/scan-batch-review/${item.id}`)}>
                  <AppCard>
                    <HStack className="items-center justify-between">
                      <VStack space="xs">
                        <AppText className="font-semibold">{item.teamName}</AppText>
                        <AppText size="sm" className="text-muted-foreground">
                          {`${item.documentType === 'PRODUCTION_RECORD' ? 'Sổ ghi mủ' : 'Sổ bán mủ'} · ${formatDateVn(item.workDate)}`}
                        </AppText>
                      </VStack>
                      <StatusBadge label={batchStatusLabel(item.status)} tone={batchStatusTone(item.status)} />
                    </HStack>
                  </AppCard>
                </Pressable>
              ))}
            </VStack>
          )
        ) : null}
      </VStack>
    </ScrollView>
  );
}
