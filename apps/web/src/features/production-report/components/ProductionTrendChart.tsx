import { Box, Typography } from '@mui/material';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/generateCategoricalChart';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { blue, green, neutral } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { formatKg, formatShortDate } from '../utils/productionReportFormatters';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: ChartRow }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const hasBoth = row.currentKg != null && row.previousKg != null;
  const diff = hasBoth ? row.currentKg! - row.previousKg! : null;
  const diffPct = hasBoth && row.previousKg! > 0 ? (diff! / row.previousKg!) * 100 : null;

  return (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${neutral[200]}`, borderRadius: 1.5, p: 1.25, boxShadow: 3, minWidth: 180 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, color: green[700] }}>
        Tháng này: {row.currentKg != null ? formatKg(row.currentKg) : 'Chưa có dữ liệu'}
      </Typography>
      <Typography sx={{ fontSize: 12, color: blue[700] }}>
        Tháng trước: {row.previousKg != null ? formatKg(row.previousKg) : 'Chưa có dữ liệu'}
      </Typography>
      {diff != null && (
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: diff >= 0 ? green[700] : 'error.main', mt: 0.5 }}>
          Chênh lệch: {diff >= 0 ? '+' : ''}
          {formatKg(diff)} {diffPct != null ? `(${diff >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)` : ''}
        </Typography>
      )}
    </Box>
  );
}

interface ChartRow {
  date: string;
  label: string;
  currentKg: number | null;
  previousKg: number | null;
}

export function ProductionTrendChart({
  filters,
  onDayClick,
}: {
  filters: ProductionDashboardFilters;
  onDayClick: (date: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);

  const handleClick: CategoricalChartFunc = (state) => {
    const label = state?.activeLabel;
    const row = data?.trend.find((p) => formatShortDate(p.date) === label);
    if (row) onDayClick(row.date);
  };

  return (
    <SectionPanel title="Xu hướng sản lượng theo ngày">
      {isLoading ? (
        <LoadingSkeleton rows={6} rowHeight={28} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được dữ liệu xu hướng." onRetry={() => refetch()} />
      ) : data.trend.every((p) => p.currentKg == null) ? (
        <WidgetEmptyState title="Chưa có dữ liệu sản lượng" description="Không có bản ghi đã chốt nào trong khoảng ngày này." />
      ) : (
        <Box>
          {data.summary.recordedDayCount <= 2 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Hiện có dữ liệu {data.summary.recordedDayCount} ngày trong khoảng đã chọn.
            </Typography>
          )}
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={data.trend.map<ChartRow>((p) => ({
                date: p.date,
                label: formatShortDate(p.date),
                currentKg: p.currentKg,
                previousKg: p.previousPeriodKg,
              }))}
              onClick={handleClick}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={neutral[100]} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: neutral[500] }} axisLine={{ stroke: neutral[200] }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: neutral[500] }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => String(v)}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: neutral[200] }} />
              <Area
                type="monotone"
                dataKey="currentKg"
                stroke="none"
                fill={green[600]}
                fillOpacity={0.08}
                connectNulls={false}
                isAnimationActive={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="previousKg"
                name="Tháng trước"
                stroke={blue[600]}
                strokeDasharray="5 4"
                strokeWidth={1.75}
                dot={{ r: 2.5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="currentKg"
                name="Tháng này"
                stroke={green[700]}
                strokeWidth={2.25}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}
    </SectionPanel>
  );
}
