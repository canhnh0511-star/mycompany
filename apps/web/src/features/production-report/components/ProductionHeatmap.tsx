import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { heatmapScale, neutral } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { useLatexTypes } from '../../../hooks/useLookups';
import { heatmapColorFor } from '../utils/productionReportCalculations';
import { formatDate, formatKg } from '../utils/productionReportFormatters';
import type { ProductionDashboardFilters, ProductionHeatmapCell } from '../types/productionReport.types';

const CELL_SIZE = 30;
const LABEL_WIDTH = 96;

function cellTooltip(cell: ProductionHeatmapCell, latexLabels: Record<string, string>): string {
  const lines = [`${cell.teamName}`, formatDate(cell.date), ''];
  if (cell.productionKg == null) {
    lines.push('Chưa có dữ liệu');
  } else {
    lines.push(`Sản lượng: ${formatKg(cell.productionKg)}`);
    for (const [code, kg] of Object.entries(cell.kgByLatexType)) {
      lines.push(`${latexLabels[code] ?? code}: ${formatKg(kg)}`);
    }
    lines.push('');
    lines.push(`${cell.workerCount ?? 0} công nhân`);
  }
  lines.push(`${cell.documentCount} phiếu`);
  return lines.join('\n');
}

export function ProductionHeatmap({
  filters,
  onCellClick,
}: {
  filters: ProductionDashboardFilters;
  onCellClick: (teamId: string, date: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);
  const { data: latexTypes } = useLatexTypes();
  const latexLabels = Object.fromEntries((latexTypes ?? []).map((t) => [t.code, t.label]));

  if (isLoading) {
    return (
      <SectionPanel title="Sản lượng theo ngày / theo Tổ">
        <LoadingSkeleton rows={4} rowHeight={32} />
      </SectionPanel>
    );
  }
  if (isError || !data) {
    return (
      <SectionPanel title="Sản lượng theo ngày / theo Tổ">
        <WidgetErrorState message="Không tải được heatmap." onRetry={() => refetch()} />
      </SectionPanel>
    );
  }
  if (data.heatmap.length === 0) {
    return (
      <SectionPanel title="Sản lượng theo ngày / theo Tổ">
        <WidgetEmptyState title="Chưa có Tổ nào" />
      </SectionPanel>
    );
  }

  const teamIds = [...new Set(data.heatmap.map((c) => c.teamId))];
  const dates = [...new Set(data.heatmap.map((c) => c.date))].sort();
  const byKey = new Map(data.heatmap.map((c) => [`${c.teamId}__${c.date}`, c]));
  const maxKg = Math.max(0, ...data.heatmap.map((c) => c.productionKg ?? 0));

  return (
    <SectionPanel title="Sản lượng theo ngày / theo Tổ" noContentPadding>
      <Box sx={{ overflowX: 'auto', px: 2.5, py: 1.75 }}>
        <Box sx={{ display: 'inline-block', minWidth: '100%' }}>
          <Box sx={{ display: 'flex' }}>
            <Box sx={{ width: LABEL_WIDTH, flexShrink: 0 }} />
            {dates.map((d) => (
              <Box key={d} sx={{ width: CELL_SIZE, flexShrink: 0, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{d.slice(8, 10)}</Typography>
              </Box>
            ))}
          </Box>
          {teamIds.map((teamId) => {
            const teamName = data.heatmap.find((c) => c.teamId === teamId)?.teamName ?? '';
            return (
              <Box key={teamId} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Box sx={{ width: LABEL_WIDTH, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} noWrap>{teamName}</Typography>
                </Box>
                {dates.map((d) => {
                  const cell = byKey.get(`${teamId}__${d}`);
                  const kg = cell?.productionKg ?? null;
                  const hasNoRecord = !cell || (kg == null && cell.documentCount === 0);
                  return (
                    <Tooltip
                      key={d}
                      title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{cell ? cellTooltip(cell, latexLabels) : ''}</Box>}
                      arrow
                    >
                      <Box
                        role="button"
                        tabIndex={0}
                        aria-label={`${teamName} ${formatDate(d)}: ${kg != null ? formatKg(kg) : 'chưa có dữ liệu'}`}
                        onClick={() => onCellClick(teamId, d)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onCellClick(teamId, d);
                        }}
                        sx={{
                          width: CELL_SIZE - 3,
                          height: CELL_SIZE - 3,
                          m: '1.5px',
                          borderRadius: 0.75,
                          bgcolor: heatmapColorFor(kg, maxKg),
                          border: hasNoRecord ? `1px dashed ${neutral[200]}` : 'none',
                          cursor: 'pointer',
                          transition: 'transform 120ms',
                          '&:hover': { transform: 'scale(1.08)' },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Thấp</Typography>
            {[heatmapScale.veryLow, heatmapScale.low, heatmapScale.medium, heatmapScale.high, heatmapScale.veryHigh].map((color) => (
              <Box key={color} sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: color }} />
            ))}
            <Typography variant="caption" color="text.secondary">Cao ({formatKg(Math.round(maxKg))})</Typography>
            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: heatmapScale.noData, border: `1px dashed ${neutral[200]}`, ml: 2 }} />
            <Typography variant="caption" color="text.secondary">Chưa có dữ liệu</Typography>
          </Stack>
        </Box>
      </Box>
    </SectionPanel>
  );
}
