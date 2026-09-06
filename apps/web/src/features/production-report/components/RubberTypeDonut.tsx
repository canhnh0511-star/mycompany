import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { amber, green, neutral } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { formatKg } from '../utils/productionReportFormatters';
import type { ProductionDashboardFilters, RubberTypeProduction } from '../types/productionReport.types';

// Cùng green family + amber nhẹ cho mủ chén để dễ phân biệt (spec §7.2) — không dùng màu neon.
const SLICE_COLORS = [green[800], amber[600], green[600], green[100]];

export function RubberTypeDonut({ filters }: { filters: ProductionDashboardFilters }) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <SectionPanel title="Cơ cấu sản lượng theo loại mủ">
      {isLoading ? (
        <LoadingSkeleton rows={5} rowHeight={22} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được cơ cấu loại mủ." onRetry={() => refetch()} />
      ) : data.rubberTypes.every((r) => r.productionKg <= 0) ? (
        <WidgetEmptyState title="Chưa có dữ liệu" description="Không có sản lượng nào đã chốt trong khoảng ngày này." />
      ) : (
        <Stack spacing={2}>
          <Box sx={{ position: 'relative', height: 168 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.rubberTypes}
                  dataKey="productionKg"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={data.rubberTypes.filter((r) => r.productionKg > 0).length > 1 ? 2 : 0}
                  isAnimationActive={false}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.rubberTypes.map((entry, index) => (
                    <Cell
                      key={entry.code}
                      fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                      style={{ transition: 'opacity 150ms', opacity: activeIndex == null || activeIndex === index ? 1 : 0.55 }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as RubberTypeProduction;
                    return (
                      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${neutral[200]}`, borderRadius: 1.5, p: 1, boxShadow: 3 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.label}</Typography>
                        <Typography sx={{ fontSize: 12 }}>{formatKg(row.productionKg)}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.percentage.toFixed(1)}%</Typography>
                      </Box>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{formatKg(data.summary.totalProductionKg)}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Tổng cộng</Typography>
            </Box>
          </Box>

          <Stack spacing={0.75}>
            {data.rubberTypes.map((row, index) => (
              <Stack key={row.code} direction="row" spacing={1} sx={{ alignItems: 'center', fontSize: 13 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: SLICE_COLORS[index % SLICE_COLORS.length], flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, flex: 1 }} noWrap>{row.label}</Typography>
                <Typography sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{formatKg(row.productionKg)}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', width: 44, textAlign: 'right' }}>
                  {row.percentage.toFixed(1)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </SectionPanel>
  );
}
