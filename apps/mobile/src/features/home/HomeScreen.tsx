import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useEmployeesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { useProductionRecordsListQuery } from '@/features/production-records/useProductionRecordsList';
import { useLatexSalesListQuery } from '@/features/latex-sales/useLatexSalesList';
import { useProductionReportQuery, useLatexSaleReportQuery, useProductionDailyTrendQuery } from '@/features/reports/useReports';
import { useProductionSummaryDailyQuery } from '@/features/production-summary/useProductionSummary';
import { todayIsoDate, last7DaysRange } from '@/features/reports/dateRange';
import { useTeamDailySummaries } from './useTeamDailySummaries';
import { HomeHeader } from './HomeHeader';
import { ProductionSummaryCard } from './ProductionSummaryCard';
import { ClipboardCheckIcon, DocumentIcon, PeopleIcon, TagIcon } from './HomeIcons';

type ChartFilter = 'total' | 'water' | 'cup' | 'other';
const CHART_FILTERS: { key: ChartFilter; label: string }[] = [
  { key: 'total', label: 'Tổng' },
  { key: 'water', label: 'Mủ nước' },
  { key: 'cup', label: 'Mủ chén' },
  { key: 'other', label: 'Khác' },
];

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

  const [chartFilter, setChartFilter] = useState<ChartFilter>('total');

  const productionReport = useProductionReportQuery({ fromDate: today, toDate: today });
  const dailyTrend = useProductionDailyTrendQuery(sevenDayRange);
  // Breakdown theo loại mủ cho card "Sản lượng ghi nhận" — cùng nguồn `/production-summary/daily` đã
  // dùng ở tab "Sản lượng" (Phase 4/5 Spec 2), KHÔNG teamId = tổng hợp toàn công ty trong ngày.
  const productionSummaryDaily = useProductionSummaryDailyQuery({ workDate: today });
  // 3 query "Sản lượng 7 ngày" theo loại mủ — chỉ bật đúng 1-2 cái khớp filter đang chọn (xem
  // useProductionDailyTrendQuery `options.enabled`), tránh bắn thừa request lúc mount màn.
  const dailyTrendWater = useProductionDailyTrendQuery(
    { ...sevenDayRange, latexTypeCode: 'water' },
    { enabled: chartFilter === 'water' },
  );
  const dailyTrendCup = useProductionDailyTrendQuery(
    { ...sevenDayRange, latexTypeCode: 'cup' },
    { enabled: chartFilter === 'cup' },
  );
  const dailyTrendStrip = useProductionDailyTrendQuery(
    { ...sevenDayRange, latexTypeCode: 'strip' },
    { enabled: chartFilter === 'other' },
  );
  const dailyTrendCoagulated = useProductionDailyTrendQuery(
    { ...sevenDayRange, latexTypeCode: 'coagulated' },
    { enabled: chartFilter === 'other' },
  );
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
    productionSummaryDaily.isLoading ||
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
    productionSummaryDaily.isError ||
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
    productionSummaryDaily.error ??
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

  // Data cho biểu đồ "Sản lượng 7 ngày" theo filter đang chọn — "Khác" (mủ dây+đông) không có sẵn ở
  // backend theo 1 query duy nhất (cố ý, xem comment `aggregateDailyTotals` phía backend), cộng dồn 2
  // query strip+coagulated ở đây thay vì special-case query cho 1 trường hợp lọc gộp duy nhất.
  const chartDays = useMemo(() => {
    if (chartFilter === 'water') return dailyTrendWater.data?.days ?? [];
    if (chartFilter === 'cup') return dailyTrendCup.data?.days ?? [];
    if (chartFilter === 'other') {
      const strip = dailyTrendStrip.data?.days ?? [];
      const coagulated = dailyTrendCoagulated.data?.days ?? [];
      if (strip.length === 0 || strip.length !== coagulated.length) return [];
      return strip.map((d, i) => ({ recordDate: d.recordDate, totalKg: d.totalKg + (coagulated[i]?.totalKg ?? 0) }));
    }
    return dailyTrend.data?.days ?? [];
  }, [chartFilter, dailyTrend.data, dailyTrendWater.data, dailyTrendCup.data, dailyTrendStrip.data, dailyTrendCoagulated.data]);

  const chartLoading =
    chartFilter === 'water'
      ? dailyTrendWater.isLoading
      : chartFilter === 'cup'
        ? dailyTrendCup.isLoading
        : chartFilter === 'other'
          ? dailyTrendStrip.isLoading || dailyTrendCoagulated.isLoading
          : dailyTrend.isLoading;

  const chartMaxKg = useMemo(() => Math.max(...chartDays.map((d) => d.totalKg), 1), [chartDays]);

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
        <HomeHeader dateLabel={formatTodayLabel()} onCapture={() => router.push('/(tabs)/capture')} />

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
              <ProductionSummaryCard
                totalKg={productionReport.data?.grandTotalKg ?? 0}
                trendPercent={trend?.percent ?? null}
                byLatexType={productionSummaryDaily.data?.byLatexType ?? []}
              />

              {/* Grid 2×2 — 4 card độc lập thay vì 2 AppCard gộp đôi trước đây, để "Chờ kiểm tra" tách
                  riêng bấm được + accent riêng (mục 5 yêu cầu). */}
              <VStack space="sm">
                <HStack space="sm">
                  <TodayMetricCard
                    icon={<PeopleIcon />}
                    title="Nhân công"
                    value={`${employeeIdsWithData.size} / ${totalActiveEmployees}`}
                    subtitle="Đã làm / Tổng"
                  />
                  <TodayMetricCard
                    icon={<TagIcon />}
                    title="Đã bán"
                    value={`${(latexSaleReport.data?.grandTotalKg ?? 0).toLocaleString('vi-VN')} kg`}
                    subtitle="Hôm nay"
                  />
                </HStack>
                <HStack space="sm">
                  <TodayMetricCard
                    icon={<DocumentIcon />}
                    title="Phiếu hôm nay"
                    value={String(phieuHomNay)}
                    subtitle="Phiếu"
                  />
                  <TodayMetricCard
                    icon={<ClipboardCheckIcon color="#1D6FBE" />}
                    title="Chờ kiểm tra"
                    value={String(dangChoReview)}
                    subtitle="Phiếu"
                    accent
                    onPress={() => router.push('/(tabs)/lookup')}
                  />
                </HStack>
              </VStack>
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
                {/* Chip/card gọn ngang, cuộn ngang khi nhiều Tổ (mục 6 yêu cầu — không wrap nhiều hàng). */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack space="sm">
                    {teamSummaries.map(({ team, status }) => {
                      const tone = status === 'done' ? 'text-success' : status === 'partial' ? 'text-warning' : 'text-muted-foreground';
                      const label = status === 'done' ? 'Đã ghi nhận' : status === 'partial' ? 'Đang xử lý' : 'Chưa ghi nhận';
                      const dot = status === 'none' ? '○' : '●';
                      return (
                        <Box key={team.id} className="rounded-xl border border-border bg-card px-4 py-3" style={{ minWidth: 128 }}>
                          <AppText size="sm" className="font-medium">
                            {team.name}
                          </AppText>
                          <AppText size="xs" className={`mt-1 ${tone}`}>
                            {`${dot} ${label}`}
                          </AppText>
                        </Box>
                      );
                    })}
                  </HStack>
                </ScrollView>
              </VStack>
            ) : null}

            <VStack space="sm">
              <AppText className="font-semibold" size="lg">
                Sản lượng 7 ngày
              </AppText>
              <HStack space="xs">
                {CHART_FILTERS.map((f) => {
                  const selected = chartFilter === f.key;
                  return (
                    <Pressable key={f.key} onPress={() => setChartFilter(f.key)}>
                      <Box
                        className={`rounded-full px-3 py-1.5 border ${
                          selected ? 'bg-primary border-primary' : 'bg-background border-border'
                        }`}
                      >
                        <AppText size="xs" className={selected ? 'font-semibold text-primary-foreground' : 'text-muted-foreground'}>
                          {f.label}
                        </AppText>
                      </Box>
                    </Pressable>
                  );
                })}
              </HStack>
              <AppCard>
                {chartLoading ? (
                  <LoadingState label="Đang tải biểu đồ..." />
                ) : chartDays.length > 1 ? (
                  <>
                    <HStack className="items-end" space="sm" style={{ height: 72 }}>
                      {chartDays.map((d, i) => (
                        <Box
                          key={d.recordDate}
                          className={`flex-1 rounded ${i === chartDays.length - 1 ? 'bg-primary' : 'bg-primary/25'}`}
                          style={{ height: `${Math.max((d.totalKg / chartMaxKg) * 100, 4)}%` }}
                        />
                      ))}
                    </HStack>
                    <HStack className="justify-between mt-2.5">
                      <AppText size="xs" className="text-muted-foreground">
                        {formatShortDate(chartDays[0].recordDate)}
                      </AppText>
                      <AppText size="xs" className="text-muted-foreground">
                        Hôm nay
                      </AppText>
                    </HStack>
                  </>
                ) : (
                  <AppText size="sm" className="text-muted-foreground text-center py-4">
                    Chưa đủ dữ liệu so sánh
                  </AppText>
                )}
              </AppCard>
            </VStack>

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

/**
 * 1 ô trong grid 2×2 "Nhân công/Đã bán/Phiếu hôm nay/Chờ kiểm tra" (mục 5 yêu cầu redesign Home). Card
 * "actionable" duy nhất là "Chờ kiểm tra" (`accent`+`onPress`) — accent dùng token `info` sẵn có (xanh
 * dương nhạt) thay vì tím/lilac như ảnh tham chiếu (project chưa có token màu tím, ưu tiên design system
 * hiện tại hơn khớp đúng màu ảnh, theo đúng thứ tự ưu tiên yêu cầu). KHÔNG dùng tone `warning`/`error`
 * cho card này — "chờ kiểm tra" là việc cần làm bình thường, không phải lỗi/cảnh báo.
 */
function TodayMetricCard({
  icon,
  title,
  value,
  subtitle,
  accent,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  accent?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <Box
      className={`flex-1 rounded-2xl border p-4 ${accent ? 'bg-info/10 border-info/30' : 'bg-card border-border'}`}
    >
      <HStack className="items-center justify-between">
        <HStack space="xs" className="items-center">
          {icon}
          <AppText size="sm" className="text-muted-foreground">
            {title}
          </AppText>
        </HStack>
        {accent ? (
          <AppText size="sm" className="text-info">
            ›
          </AppText>
        ) : null}
      </HStack>
      <AppText size="xl" className="font-semibold font-mono mt-1">
        {value}
      </AppText>
      <AppText size="xs" className="text-muted-foreground mt-0.5">
        {subtitle}
      </AppText>
    </Box>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {content}
    </Pressable>
  ) : (
    <Box style={{ flex: 1 }}>{content}</Box>
  );
}
