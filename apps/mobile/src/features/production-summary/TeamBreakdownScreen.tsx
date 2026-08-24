import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useTeamBreakdownQuery } from './useProductionSummary';
import type { EmployeeProductionRow } from '@/types/api';

function formatDateVn(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Chi tiết Tổ — Spec 2 §17/§18/§22-24. Chỉ dùng LAYOUT DẠNG CARD (không table ngang) — §18 "Mobile
 * Employee List": app này chạy chủ yếu trên điện thoại (CLAUDE.md §5), bản desktop/tablet ưu tiên
 * table (§19) chưa làm ở phase này (chưa có yêu cầu thực tế dùng web/tablet cho màn Sản lượng, xem
 * plan Phase 5 — DataTable dùng chung để dành cho lần có nhu cầu thật, tránh over-engineer trước).
 */
export function TeamBreakdownScreen({
  teamId,
  workDate,
  latexTypeCode,
}: {
  teamId: string;
  workDate: string;
  latexTypeCode?: string;
}) {
  const router = useRouter();
  const query = useTeamBreakdownQuery(teamId, { workDate, latexTypeCode });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
    >
      <VStack space="md">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/lookup'))}>
          <AppText size="sm" className="text-primary">
            ‹ Sản lượng
          </AppText>
        </Pressable>

        {query.isLoading ? <LoadingState label="Đang tải chi tiết Tổ..." /> : null}
        {query.isError ? (
          <ErrorState
            message="Không thể tải chi tiết Tổ."
            detail={getErrorMessage(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : null}

        {!query.isLoading && !query.isError && query.data ? (
          <VStack space="md">
            <VStack>
              <AppHeading size="xl">{query.data.teamName.toUpperCase()}</AppHeading>
              <AppText className="text-muted-foreground">{formatDateVn(workDate)}</AppText>
            </VStack>

            <AppCard>
              <AppText className="text-muted-foreground">Đã xác nhận</AppText>
              <AppHeading size="2xl">{`${query.data.totalKg.toLocaleString('vi-VN')} kg`}</AppHeading>
              <AppText size="sm" className="text-muted-foreground mt-1">
                {`${query.data.employees.length} công nhân có sản lượng`}
              </AppText>
            </AppCard>

            {query.data.employees.length === 0 ? (
              <EmptyState message="Không có nhân viên nào có sản lượng khớp bộ lọc." />
            ) : (
              <VStack space="sm">
                {query.data.employees.map((row) => (
                  <EmployeeCard
                    key={row.recordId}
                    row={row}
                    onPress={() => router.push(`/record-detail/production/${row.recordId}`)}
                  />
                ))}
              </VStack>
            )}
          </VStack>
        ) : null}
      </VStack>
    </ScrollView>
  );
}

function EmployeeCard({ row, onPress }: { row: EmployeeProductionRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <AppCard>
        <AppText className="font-semibold">{row.employeeName}</AppText>
        <VStack space="xs" className="mt-1">
          {row.byLatexType.map((lt) => (
            <HStack key={lt.code} className="justify-between">
              <AppText size="sm" className="text-muted-foreground">
                {lt.label}
              </AppText>
              <AppText size="sm" className="font-mono">
                {`${lt.kg.toLocaleString('vi-VN')} kg`}
              </AppText>
            </HStack>
          ))}
          {row.drcPercent != null ? (
            <HStack className="justify-between">
              <AppText size="sm" className="text-muted-foreground">
                DRC
              </AppText>
              <AppText size="sm" className="font-mono">
                {`${row.drcPercent.toLocaleString('vi-VN')} %`}
              </AppText>
            </HStack>
          ) : null}
        </VStack>
        {/* 2 dimension độc lập — Spec 2 §23, không gộp 1 field "Nguồn". */}
        <HStack space="xs" className="mt-2">
          <Box className="rounded-full px-2 py-0.5 bg-muted">
            <AppText size="xs" className="text-muted-foreground">
              {row.captureMethod === 'OCR' ? 'OCR' : 'Nhập tay'}
            </AppText>
          </Box>
          {row.originContext === 'SUPPLEMENT' ? (
            <Box className="rounded-full px-2 py-0.5 bg-warning/15">
              <AppText size="xs" className="text-warning">
                Bổ sung sau xác nhận
              </AppText>
            </Box>
          ) : null}
        </HStack>
      </AppCard>
    </Pressable>
  );
}
