import { Box } from '@mui/material';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { ProductionKpiCard } from './ProductionKpiCard';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { formatKg, formatNumber } from '../utils/productionReportFormatters';
import { formatPercent } from '../utils/productionReportFormatters';
import { trendSemantic } from '../utils/productionReportCalculations';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

const iconSx = { fontSize: 18 } as const;

// `minmax(0, 1fr)` thay vì `1fr` trần — chặn "grid blowout" (xem giải thích ở DailyEntryPage.tsx).
const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
  gap: 2,
};

export function ProductionKpiRow({ filters }: { filters: ProductionDashboardFilters }) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);

  if (isLoading) {
    return (
      <Box sx={gridSx}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box key={index}>
            <LoadingSkeleton rows={3} rowHeight={22} />
          </Box>
        ))}
      </Box>
    );
  }

  if (isError || !data) {
    return <WidgetErrorState message="Không thể tải KPI sản lượng." onRetry={() => refetch()} />;
  }

  const { summary } = data;

  return (
    <Box sx={gridSx}>
      <ProductionKpiCard
        title="Tổng sản lượng"
        icon={<WaterDropRoundedIcon sx={iconSx} />}
        value={formatKg(summary.totalProductionKg)}
        secondary={summary.recordedDayCount <= 1 ? `Dữ liệu ${summary.recordedDayCount} ngày` : undefined}
        trendValue={
          summary.previousPeriodAvailable && summary.previousPeriodChangePercent != null
            ? `${formatPercent(summary.previousPeriodChangePercent)} so với kỳ trước`
            : undefined
        }
        trendSemantic={trendSemantic(summary.previousPeriodChangePercent)}
      />
      <ProductionKpiCard
        title="Bình quân / ngày"
        icon={<CalendarTodayRoundedIcon sx={iconSx} />}
        value={summary.averagePerRecordedDayKg != null ? formatKg(summary.averagePerRecordedDayKg) : 'Chưa có dữ liệu'}
        secondary={`Trung bình ${summary.recordedDayCount} ngày có dữ liệu`}
        helpText="Tính trên các ngày đã có dữ liệu, không chia cho toàn bộ ngày trong khoảng lọc."
      />
      <ProductionKpiCard
        title="Năng suất / công nhân"
        icon={<PeopleAltRoundedIcon sx={iconSx} />}
        value={summary.averagePerWorkerKg != null ? formatKg(summary.averagePerWorkerKg) : 'Chưa có dữ liệu'}
        secondary={summary.workerCount > 0 ? `Trên ${formatNumber(summary.workerCount)} công nhân` : undefined}
        helpText="Tổng sản lượng chia cho số công nhân có ít nhất 1 phiếu đã chốt trong kỳ."
      />
      <ProductionKpiCard
        title="Tỷ lệ đủ dữ liệu"
        icon={<FactCheckRoundedIcon sx={iconSx} />}
        value={`${summary.totalDaysInRange > 0 ? Math.round((summary.completedDayCount * 100) / summary.totalDaysInRange) : 0}%`}
        secondary={`${summary.completedDayCount}/${summary.totalDaysInRange} ngày đã chốt`}
      />
      <ProductionKpiCard
        title="Biến động"
        icon={<TrendingUpRoundedIcon sx={iconSx} />}
        value={
          summary.previousPeriodAvailable && summary.previousPeriodChangePercent != null
            ? formatPercent(summary.previousPeriodChangePercent)
            : '—'
        }
        secondary={
          summary.previousPeriodAvailable && summary.previousPeriodChangeKg != null
            ? `${summary.previousPeriodChangeKg >= 0 ? 'Tăng' : 'Giảm'} ${formatKg(Math.abs(summary.previousPeriodChangeKg))}`
            : 'Chưa có dữ liệu kỳ trước'
        }
        trendSemantic={trendSemantic(summary.previousPeriodChangePercent)}
      />
    </Box>
  );
}
