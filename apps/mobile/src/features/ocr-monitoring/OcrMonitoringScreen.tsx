import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppDateInput } from '@/components/AppDateInput';
import { AppSelect } from '@/components/AppSelect';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import type { OcrTargetType } from '@/types/api';
import { useOcrCallLogsQuery, useOcrCallLogStatsQuery } from './useOcrCallLogs';

const TARGET_TYPE_OPTIONS: { label: string; value: OcrTargetType | '' }[] = [
  { label: 'Tất cả loại phiếu', value: '' },
  { label: 'Sổ ghi mủ', value: 'PRODUCTION_RECORD' },
  { label: 'Sổ bán mủ', value: 'LATEX_SALE' },
];

const SUCCESS_OPTIONS: { label: string; value: 'all' | 'true' | 'false' }[] = [
  { label: 'Tất cả kết quả', value: 'all' },
  { label: 'Thành công', value: 'true' },
  { label: 'Lỗi', value: 'false' },
];

/** Theo dõi OCR (Tuần 6, ADR-0019 mục 4) — ocr_call_logs list + /stats, chỉ Admin xem (CLAUDE.md §2).
 * Không lọc `typeMismatch` riêng ở list (backend chưa có filter này) — Admin đọc trực tiếp cột. */
export function OcrMonitoringScreen() {
  const [targetType, setTargetType] = useState<OcrTargetType | ''>('');
  const [success, setSuccess] = useState<'all' | 'true' | 'false'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filters = {
    targetType: targetType || undefined,
    success: success === 'all' ? undefined : success === 'true',
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const statsQuery = useOcrCallLogStatsQuery({ fromDate: filters.fromDate, toDate: filters.toDate });
  const listQuery = useOcrCallLogsQuery(filters);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <AppHeading size="xl">Theo dõi OCR</AppHeading>

        <HStack space="sm" className="flex-wrap items-end">
          <Box className="w-40">
            <AppDateInput label="Từ ngày" value={fromDate} onChangeText={setFromDate} />
          </Box>
          <Box className="w-40">
            <AppDateInput label="Đến ngày" value={toDate} onChangeText={setToDate} />
          </Box>
          <Box className="w-48">
            <AppSelect label="Loại phiếu" value={targetType || null} options={TARGET_TYPE_OPTIONS} onChange={(v) => setTargetType(v)} />
          </Box>
          <Box className="w-40">
            <AppSelect label="Kết quả" value={success} options={SUCCESS_OPTIONS} onChange={(v) => setSuccess(v)} />
          </Box>
        </HStack>

        <StatsPanel
          isLoading={statsQuery.isLoading}
          isError={statsQuery.isError}
          error={statsQuery.error}
          stats={statsQuery.data}
        />

        {listQuery.isLoading ? <SkeletonList /> : null}
        {listQuery.isError ? (
          <ErrorState message="Không tải được danh sách." detail={getErrorMessage(listQuery.error)} />
        ) : null}
        {listQuery.data && listQuery.data.content.length === 0 ? (
          <EmptyState message="Không có lần gọi OCR nào khớp bộ lọc." />
        ) : null}

        {listQuery.data && listQuery.data.content.length > 0 ? (
          <ScrollView horizontal>
            <VStack className="min-w-full">
              <HStack className="border-b border-border py-2">
                <Box className="w-40 px-2"><AppText size="sm" className="font-semibold">Thời điểm</AppText></Box>
                <Box className="w-32 px-2"><AppText size="sm" className="font-semibold">Loại phiếu</AppText></Box>
                <Box className="w-24 px-2"><AppText size="sm" className="font-semibold">Kết quả</AppText></Box>
                <Box className="w-28 px-2"><AppText size="sm" className="font-semibold">Khớp loại?</AppText></Box>
                <Box className="w-28 px-2"><AppText size="sm" className="font-semibold">Model</AppText></Box>
                <Box className="w-24 px-2 items-end"><AppText size="sm" className="font-semibold">Thời gian (ms)</AppText></Box>
                <Box className="w-24 px-2 items-end"><AppText size="sm" className="font-semibold">Chi phí (USD)</AppText></Box>
                <Box className="w-32 px-2"><AppText size="sm" className="font-semibold">Người gọi</AppText></Box>
              </HStack>
              {listQuery.data.content.map((log) => (
                <HStack key={log.id} className="border-b border-border py-1.5">
                  <Box className="w-40 px-2"><AppText size="sm">{new Date(log.calledAt).toLocaleString('vi-VN')}</AppText></Box>
                  <Box className="w-32 px-2">
                    <AppText size="sm">{log.targetType === 'PRODUCTION_RECORD' ? 'Sổ ghi mủ' : 'Sổ bán mủ'}</AppText>
                  </Box>
                  <Box className="w-24 px-2">
                    {log.success ? (
                      <StatusBadge label="Thành công" tone="success" />
                    ) : (
                      <StatusBadge label="Lỗi" tone="error" />
                    )}
                  </Box>
                  <Box className="w-28 px-2">
                    {log.success ? (
                      log.typeMismatch ? (
                        <StatusBadge label="Không khớp" tone="warning" />
                      ) : (
                        <AppText size="sm">Khớp</AppText>
                      )
                    ) : (
                      <AppText size="sm" className="text-muted-foreground">—</AppText>
                    )}
                  </Box>
                  <Box className="w-28 px-2"><AppText size="sm">{log.model}</AppText></Box>
                  <Box className="w-24 px-2 items-end"><AppText size="sm" className="font-mono">{log.durationMs}</AppText></Box>
                  <Box className="w-24 px-2 items-end">
                    <AppText size="sm" className="font-mono">
                      {log.estimatedCostUsd != null ? log.estimatedCostUsd.toFixed(4) : '—'}
                    </AppText>
                  </Box>
                  <Box className="w-32 px-2"><AppText size="sm">{log.calledByName}</AppText></Box>
                </HStack>
              ))}
            </VStack>
          </ScrollView>
        ) : null}
      </VStack>
    </ScrollView>
  );
}

function StatsPanel({
  isLoading,
  isError,
  error,
  stats,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  stats: ReturnType<typeof useOcrCallLogStatsQuery>['data'];
}) {
  if (isLoading) {
    return (
      <HStack space="sm" className="flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={144} height={56} radius={12} />
        ))}
      </HStack>
    );
  }
  if (isError) {
    return <ErrorState message="Không tải được thống kê." detail={getErrorMessage(error)} />;
  }
  if (!stats) return null;

  return (
    <HStack space="sm" className="flex-wrap">
      <StatCard label="Tổng số lần gọi" value={String(stats.totalCalls)} />
      <StatCard label="Tỷ lệ thành công" value={`${(stats.successRate * 100).toFixed(1)}%`} />
      <StatCard label="Tỷ lệ không khớp loại phiếu" value={`${(stats.typeMismatchRate * 100).toFixed(1)}%`} />
      <StatCard label="Tổng chi phí ước tính" value={`$${stats.totalEstimatedCostUsd.toFixed(4)}`} />
      <StatCard label="Thời gian phản hồi TB" value={stats.avgDurationMs != null ? `${Math.round(stats.avgDurationMs)} ms` : '—'} />
    </HStack>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <AppCard className="min-w-36">
      <AppText size="xs" className="text-muted-foreground">{label}</AppText>
      <AppText size="lg" className="font-semibold">{value}</AppText>
    </AppCard>
  );
}
