import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useEmployeesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { useProductionRecordsListQuery } from '@/features/production-records/useProductionRecordsList';
import { useLatexSalesListQuery } from '@/features/latex-sales/useLatexSalesList';
import { useProductionReportQuery, useLatexSaleReportQuery, useProductionDailyTrendQuery } from '@/features/reports/useReports';
import { todayIsoDate, last7DaysRange } from '@/features/reports/dateRange';
import { useTeamDailySummaries } from './useTeamDailySummaries';

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function formatTodayLabel(): string {
  const now = new Date();
  const weekday = WEEKDAY_LABELS[now.getDay()];
  return `${weekday}, ${todayIsoDate().split('-').reverse().join('/')}`;
}

/** "2026-08-06" → "06/08" — nhãn ngắn cho biểu đồ 7 ngày. */
function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Home / Daily Dashboard (Phase 4, module-1-1-frontend-redesign) — feature mới được Product Owner
 * duyệt riêng (2026-08-13), KHÔNG có trong CLAUDE.md §5 bản gốc.
 *
 * Trend "↑X% so với TB 7 ngày" + biểu đồ "Sản lượng 7 ngày" (đợt đầu Phase 4 đã BỎ khỏi MVP vì thiếu
 * API tổng hợp theo ngày — xem lý do cũ trong audit) — bổ sung 2026-08-13 sau khi backend có
 * `GET /api/v1/reports/production-records/daily-trend` (mới, `ReportController`/`ReportService`,
 * xem docs/module-1-1-frontend-redesign-progress.md). "Chênh lệch ghi nhận vs bán mủ" VẪN bỏ — chênh
 * lệch có thể hợp lệ (bán khác ngày với thu), dễ gây hiểu nhầm là lỗi, không phải vấn đề thiếu API.
 */
export function HomeScreen() {
  const router = useRouter();
  const today = todayIsoDate();
  const sevenDayRange = last7DaysRange();

  const productionReport = useProductionReportQuery({ fromDate: today, toDate: today });
  const dailyTrend = useProductionDailyTrendQuery(sevenDayRange);
  const latexSaleReport = useLatexSaleReportQuery({ fromDate: today, toDate: today });
  const productionToday = useProductionRecordsListQuery({ fromDate: today, toDate: today });
  const latexSaleToday = useLatexSalesListQuery({ fromDate: today, toDate: today });
  const draftProduction = useProductionRecordsListQuery({ status: 'DRAFT' });
  const draftLatexSale = useLatexSalesListQuery({ status: 'DRAFT' });
  const activeEmployees = useEmployeesLookupQuery({ status: 'ACTIVE' });
  const { summaries: teamSummaries, isLoading: teamSummariesLoading, isError: teamSummariesIsError, error: teamSummariesError } =
    useTeamDailySummaries(today);

  const isLoading =
    productionReport.isLoading ||
    dailyTrend.isLoading ||
    latexSaleReport.isLoading ||
    productionToday.isLoading ||
    latexSaleToday.isLoading ||
    draftProduction.isLoading ||
    draftLatexSale.isLoading ||
    activeEmployees.isLoading ||
    teamSummariesLoading;

  const isError =
    productionReport.isError ||
    dailyTrend.isError ||
    latexSaleReport.isError ||
    productionToday.isError ||
    latexSaleToday.isError ||
    draftProduction.isError ||
    draftLatexSale.isError ||
    activeEmployees.isError ||
    teamSummariesIsError;

  const firstError =
    productionReport.error ??
    dailyTrend.error ??
    latexSaleReport.error ??
    productionToday.error ??
    latexSaleToday.error ??
    draftProduction.error ??
    draftLatexSale.error ??
    activeEmployees.error ??
    teamSummariesError;

  const phieuHomNay = (productionToday.data?.totalElements ?? 0) + (latexSaleToday.data?.totalElements ?? 0);
  const dangChoReview = (draftProduction.data?.totalElements ?? 0) + (draftLatexSale.data?.totalElements ?? 0);

  const employeeIdsWithData = useMemo(
    () => new Set((productionReport.data?.rows ?? []).map((r) => r.employeeId)),
    [productionReport.data],
  );
  const totalActiveEmployees = activeEmployees.data?.length ?? 0;

  const teamsWithoutDataToday = useMemo(
    () => teamSummaries.filter((s) => s.status === 'none').map((s) => s.team),
    [teamSummaries],
  );

  /** So hôm nay với TB 6 ngày trước đó (không tính hôm nay vào baseline — hôm nay là điểm đang so sánh).
   * `null` khi chưa đủ dữ liệu hoặc baseline = 0 (chia 0 vô nghĩa, vd Tổ mới lập chưa có lịch sử). */
  const trend = useMemo(() => {
    const days = dailyTrend.data?.days ?? [];
    if (days.length < 2) return null;
    const todayPoint = days[days.length - 1];
    const previousDays = days.slice(0, -1);
    const avgPrevious = previousDays.reduce((sum, d) => sum + d.totalKg, 0) / previousDays.length;
    if (avgPrevious <= 0) return null;
    const percent = ((todayPoint.totalKg - avgPrevious) / avgPrevious) * 100;
    return { percent };
  }, [dailyTrend.data]);

  const chartMaxKg = useMemo(
    () => Math.max(...(dailyTrend.data?.days ?? []).map((d) => d.totalKg), 1),
    [dailyTrend.data],
  );

  const attentionItems: { key: string; label: string; actionLabel: string; onPress: () => void }[] = [];
  for (const team of teamsWithoutDataToday) {
    attentionItems.push({
      key: `team-${team.id}`,
      label: `⚠ ${team.name} chưa có phiếu hôm nay`,
      actionLabel: 'Chụp',
      onPress: () => router.push('/(tabs)/capture'),
    });
  }
  if (dangChoReview > 0) {
    attentionItems.push({
      key: 'draft',
      label: `⚠ ${dangChoReview} phiếu cần kiểm tra`,
      actionLabel: 'Kiểm tra',
      onPress: () => router.push('/(tabs)/lookup'),
    });
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="lg">
        <VStack space="xs">
          <AppHeading size="2xl">Hôm nay</AppHeading>
          <AppText className="text-muted-foreground">{formatTodayLabel()}</AppText>
        </VStack>

        <AppButton size="lg" onPress={() => router.push('/(tabs)/capture')}>
          Chụp phiếu
        </AppButton>

        {isLoading ? <LoadingState label="Đang tải tình hình hôm nay..." /> : null}
        {isError ? (
          <ErrorState message="Không tải được tình hình hôm nay." detail={getErrorMessage(firstError)} />
        ) : null}

        {!isLoading && !isError ? (
          <>
            <VStack space="sm">
              <AppText className="font-semibold" size="lg">
                Tình hình hôm nay
              </AppText>
              <AppCard>
                <AppText size="sm" className="text-muted-foreground">
                  Sản lượng ghi nhận
                </AppText>
                <HStack className="items-baseline mt-1" space="xs">
                  <AppText size="2xl" className="font-semibold font-mono">
                    {(productionReport.data?.grandTotalKg ?? 0).toLocaleString('vi-VN')}
                  </AppText>
                  <AppText className="text-muted-foreground">kg</AppText>
                </HStack>
                {trend ? (
                  <AppText size="sm" className={`mt-1 ${trend.percent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {`${trend.percent >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(trend.percent))}% so với TB 7 ngày`}
                  </AppText>
                ) : null}
              </AppCard>

              <AppCard>
                <HStack>
                  <VStack className="flex-1 pr-3">
                    <AppText size="sm" className="text-muted-foreground">
                      Nhân công
                    </AppText>
                    <AppText size="xl" className="font-semibold font-mono mt-1">
                      {`${employeeIdsWithData.size} / ${totalActiveEmployees}`}
                    </AppText>
                  </VStack>
                  <VStack className="flex-1 pl-3 border-l border-border">
                    <AppText size="sm" className="text-muted-foreground">
                      Đã bán
                    </AppText>
                    <AppText size="xl" className="font-semibold font-mono mt-1">
                      {`${(latexSaleReport.data?.grandTotalKg ?? 0).toLocaleString('vi-VN')} kg`}
                    </AppText>
                  </VStack>
                </HStack>
              </AppCard>

              <AppCard>
                <HStack>
                  <VStack className="flex-1 pr-3">
                    <AppText size="sm" className="text-muted-foreground">
                      Phiếu hôm nay
                    </AppText>
                    <AppText size="xl" className="font-semibold font-mono mt-1">
                      {phieuHomNay}
                    </AppText>
                  </VStack>
                  <VStack className="flex-1 pl-3 border-l border-border">
                    <AppText size="sm" className="text-muted-foreground">
                      Đang chờ review
                    </AppText>
                    <AppText size="xl" className="font-semibold font-mono mt-1">
                      {dangChoReview}
                    </AppText>
                  </VStack>
                </HStack>
              </AppCard>
            </VStack>

            {teamSummaries.length > 0 ? (
              <VStack space="sm">
                <HStack className="items-center justify-between">
                  <AppText className="font-semibold" size="lg">
                    Tổ hôm nay
                  </AppText>
                  <Pressable onPress={() => router.push('/team-workday')}>
                    <AppText size="sm" className="text-primary font-medium">
                      Xem tất cả
                    </AppText>
                  </Pressable>
                </HStack>
                {/* Lưới ngang khớp Claude Design 1a (4 Tổ cùng 1 hàng) — bọc ScrollView ngang để không vỡ
                    layout khi số Tổ thực tế nhiều hơn 4-5 (design giả định cố định 4 Tổ). */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <AppCard className="p-0 overflow-hidden flex-row">
                    {teamSummaries.map(({ team, status }, i) => (
                      <VStack
                        key={team.id}
                        space="xs"
                        className={`items-center py-3 px-4 ${i > 0 ? 'border-l border-border' : ''}`}
                        style={{ minWidth: 84 }}
                      >
                        <AppText size="sm" className="font-medium">
                          {team.name}
                        </AppText>
                        {status === 'done' ? (
                          <AppText size="xs" className="text-success">
                            ✓ Xong
                          </AppText>
                        ) : status === 'partial' ? (
                          <AppText size="xs" className="text-warning">
                            ⚠ Thiếu
                          </AppText>
                        ) : (
                          <AppText size="xs" className="text-muted-foreground">
                            ○ Chưa
                          </AppText>
                        )}
                      </VStack>
                    ))}
                  </AppCard>
                </ScrollView>
              </VStack>
            ) : null}

            {(dailyTrend.data?.days.length ?? 0) > 1 ? (
              <VStack space="sm">
                <AppText className="font-semibold" size="lg">
                  Sản lượng 7 ngày
                </AppText>
                <AppCard>
                  <HStack className="items-end" space="sm" style={{ height: 72 }}>
                    {dailyTrend.data!.days.map((d, i) => (
                      <Box
                        key={d.recordDate}
                        className={`flex-1 rounded ${
                          i === dailyTrend.data!.days.length - 1 ? 'bg-primary' : 'bg-primary/25'
                        }`}
                        style={{ height: `${Math.max((d.totalKg / chartMaxKg) * 100, 4)}%` }}
                      />
                    ))}
                  </HStack>
                  <HStack className="justify-between mt-2.5">
                    <AppText size="xs" className="text-muted-foreground">
                      {formatShortDate(dailyTrend.data!.days[0].recordDate)}
                    </AppText>
                    <AppText size="xs" className="text-muted-foreground">
                      Hôm nay
                    </AppText>
                  </HStack>
                </AppCard>
              </VStack>
            ) : null}

            {attentionItems.length > 0 ? (
              <VStack space="sm">
                <AppText className="font-semibold" size="lg">
                  {`Cần chú ý · ${attentionItems.length}`}
                </AppText>
                <AppCard className="bg-warning/10 border-warning/40">
                  <VStack space="sm">
                    {attentionItems.map((item) => (
                      <HStack key={item.key} className="items-center justify-between">
                        <AppText size="sm" className="flex-1 pr-2">
                          {item.label}
                        </AppText>
                        <Pressable onPress={item.onPress}>
                          <AppText size="sm" className="text-primary font-medium">
                            {item.actionLabel}
                          </AppText>
                        </Pressable>
                      </HStack>
                    ))}
                  </VStack>
                </AppCard>
              </VStack>
            ) : null}
          </>
        ) : null}
      </VStack>
    </ScrollView>
  );
}
