import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { useOcrSessionStore } from '@/features/ocr-capture/store';
import { useProductionReportQuery } from '@/features/reports/useReports';
import { toIsoDate, todayIsoDate } from '@/features/reports/dateRange';
import { useTeamDailySummaries, type TeamDailySummary } from '@/features/home/useTeamDailySummaries';

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIsoDate(new Date(y, m - 1, d + delta));
}

function formatDateLabel(iso: string): string {
  const label = iso.split('-').reverse().join('/');
  return iso === todayIsoDate() ? `${label} · Hôm nay` : label;
}

function formatShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * "Ngày làm việc" — danh sách Tổ theo ngày (Claude Design 1d), Phase riêng SAU §16 progress doc, được
 * user yêu cầu bổ sung 2026-08-13 (cùng lúc yêu cầu API trend Home — xem `daily-trend` endpoint mới).
 * Route riêng full-screen ngoài (tabs) (giống record-detail/ocr-review), vào từ link "Xem tất cả" ở
 * khối "Tổ hôm nay" trên Home. KHÔNG cần API mới — ghép `useTeamDailySummaries` (Home, Phase 4) với
 * `productionReport` (kg CONFIRMED theo Tổ, đã có sẵn).
 */
export function TeamWorkdayScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const setActiveTeam = useOcrSessionStore((s) => s.setActiveTeam);

  const { summaries, isLoading: summariesLoading, isError: summariesError, error: summariesErr } =
    useTeamDailySummaries(selectedDate);
  const report = useProductionReportQuery({ fromDate: selectedDate, toDate: selectedDate });

  const isLoading = summariesLoading || report.isLoading;
  const isError = summariesError || report.isError;
  const error = summariesErr ?? report.error;

  const kgByTeamId = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of report.data?.teamSubtotals ?? []) map.set(t.teamId, t.totalKg);
    return map;
  }, [report.data]);

  function goCaptureFor(team: TeamDailySummary['team']) {
    setActiveTeam(team.id, team.name);
    router.push('/(tabs)/capture');
  }

  function goQuickEntry() {
    router.push('/(tabs)/quick-entry');
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <Pressable onPress={() => router.back()}>
          <AppText size="sm" className="text-primary">
            ‹ Quay lại
          </AppText>
        </Pressable>
        <AppHeading size="2xl">Ngày làm việc</AppHeading>

        <AppCard className="p-0 overflow-hidden">
          <HStack className="items-center justify-between px-4 py-3">
            <Pressable onPress={() => setSelectedDate((d) => addDays(d, -1))}>
              <AppText size="sm" className="text-muted-foreground">
                {`‹ ${formatShort(addDays(selectedDate, -1))}`}
              </AppText>
            </Pressable>
            <AppText className="font-semibold font-mono">{formatDateLabel(selectedDate)}</AppText>
            <Pressable onPress={() => setSelectedDate((d) => addDays(d, 1))}>
              <AppText size="sm" className="text-muted-foreground">
                {`${formatShort(addDays(selectedDate, 1))} ›`}
              </AppText>
            </Pressable>
          </HStack>
        </AppCard>

        {isLoading ? <SkeletonList /> : null}
        {isError ? <ErrorState message="Không tải được dữ liệu ngày này." detail={getErrorMessage(error)} /> : null}

        {!isLoading && !isError ? (
          <VStack space="sm">
            {summaries.map((s) => (
              <AppCard
                key={s.team.id}
                className={
                  s.status === 'partial'
                    ? 'border-[1.5px] border-warning'
                    : s.status === 'none'
                      ? 'border-dashed'
                      : undefined
                }
              >
                <HStack className="items-center justify-between">
                  <AppText className="font-semibold">{s.team.name}</AppText>
                  {s.status === 'done' ? (
                    <Box className="rounded-full px-2.5 py-1 bg-success/15">
                      <AppText size="xs" className="text-success font-medium">
                        ✓ Hoàn tất
                      </AppText>
                    </Box>
                  ) : s.status === 'partial' ? (
                    <Box className="rounded-full px-2.5 py-1 bg-warning/15">
                      <AppText size="xs" className="text-warning font-medium">
                        ⚠ Cần kiểm tra
                      </AppText>
                    </Box>
                  ) : (
                    <Box className="rounded-full px-2.5 py-1 bg-muted">
                      <AppText size="xs" className="text-muted-foreground font-medium">
                        ○ Chưa có phiếu
                      </AppText>
                    </Box>
                  )}
                </HStack>

                {s.status === 'none' ? (
                  <>
                    <AppText size="sm" className="text-muted-foreground mt-2.5">
                      {`Chưa có dữ liệu ${selectedDate === todayIsoDate() ? 'hôm nay' : 'ngày này'} cho ${s.totalCount} công nhân.`}
                    </AppText>
                    {selectedDate === todayIsoDate() ? (
                      <Box className="mt-3">
                        <AppButton variant="outline" onPress={() => goCaptureFor(s.team)}>
                          {`Chụp phiếu cho ${s.team.name}`}
                        </AppButton>
                      </Box>
                    ) : null}
                  </>
                ) : (
                  <>
                    <HStack className="items-baseline mt-2.5" space="md">
                      <AppText size="xl" className="font-semibold font-mono">
                        {`${(kgByTeamId.get(s.team.id) ?? 0).toLocaleString('vi-VN')} kg`}
                      </AppText>
                      <AppText size="sm" className="text-muted-foreground">
                        {`${s.submittedCount}/${s.totalCount} công nhân`}
                      </AppText>
                    </HStack>
                    {s.status === 'partial' ? (
                      <HStack className="items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                        <AppText size="sm" className="flex-1 pr-2" numberOfLines={2}>
                          {`Thiếu: ${s.missingEmployeeNames.join(', ')}`}
                        </AppText>
                        <Pressable onPress={goQuickEntry}>
                          <AppText size="sm" className="text-primary font-medium">
                            Nhập tay
                          </AppText>
                        </Pressable>
                      </HStack>
                    ) : null}
                  </>
                )}
              </AppCard>
            ))}
            {summaries.length === 0 ? (
              <AppText className="text-muted-foreground">Chưa có Tổ nào trong hệ thống.</AppText>
            ) : null}
          </VStack>
        ) : null}
      </VStack>
    </ScrollView>
  );
}
