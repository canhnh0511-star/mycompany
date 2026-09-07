import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { tableHeader, tableRow, green, red } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { formatKg, formatPercent } from '../utils/productionReportFormatters';
import { teamStatusLabel } from '../utils/productionReportFormatters';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

const STATUS_TONE = { GOOD: 'success', ATTENTION: 'warning', MISSING_DATA: 'error' } as const;

export function TeamPerformanceTable({
  filters,
  onSelectTeam,
}: {
  filters: ProductionDashboardFilters;
  onSelectTeam: (teamId: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);

  return (
    <SectionPanel title="Hiệu suất theo Tổ" noContentPadding sx={{ height: '100%' }}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={32} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được hiệu suất theo Tổ." onRetry={() => refetch()} />
      ) : data.teamPerformance.length === 0 ? (
        <WidgetEmptyState title="Chưa có Tổ nào" />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: tableHeader.sub }}>
              <TableCell>Tổ</TableCell>
              <TableCell align="right">Sản lượng (kg)</TableCell>
              <TableCell align="right">Nhân công</TableCell>
              <TableCell align="right">BQ/người</TableCell>
              <TableCell align="right">% thay đổi</TableCell>
              <TableCell>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.teamPerformance.map((row, index) => (
              <TableRow
                key={row.teamId}
                hover
                data-testid="team-performance-row"
                onClick={() => onSelectTeam(row.teamId)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectTeam(row.teamId);
                }}
                sx={{ cursor: 'pointer', bgcolor: index % 2 === 1 ? tableRow.zebra : 'background.paper' }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{row.teamName}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatKg(row.productionKg)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.workerCount}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {row.averagePerWorkerKg != null ? row.averagePerWorkerKg.toFixed(1) : '—'}
                </TableCell>
                <TableCell align="right">
                  {row.changePercent != null ? (
                    <span style={{ color: row.changePercent >= 0 ? green[700] : red[600], fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {row.changePercent >= 0 ? <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />}
                      {formatPercent(row.changePercent)}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge label={teamStatusLabel(row.status)} tone={STATUS_TONE[row.status]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionPanel>
  );
}
