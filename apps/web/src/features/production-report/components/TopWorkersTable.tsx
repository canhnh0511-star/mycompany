import { Box, Stack, Typography } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { green, neutral } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { formatKg } from '../utils/productionReportFormatters';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

export function TopWorkersTable({
  filters,
  onSelectWorker,
}: {
  filters: ProductionDashboardFilters;
  onSelectWorker: (employeeId: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);
  const maxKg = data?.topWorkers[0]?.productionKg ?? 0;

  return (
    <SectionPanel title="Top công nhân theo sản lượng">
      {isLoading ? (
        <LoadingSkeleton rows={6} rowHeight={26} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được bảng xếp hạng." onRetry={() => refetch()} />
      ) : data.topWorkers.length === 0 ? (
        <WidgetEmptyState title="Chưa có dữ liệu" description="Không có công nhân nào có sản lượng đã chốt trong kỳ." />
      ) : (
        <Stack spacing={1.25}>
          {data.topWorkers.map((worker, index) => (
            <Stack
              key={worker.employeeId}
              direction="row"
              spacing={1.25}
              data-testid="top-worker-row"
              sx={{ alignItems: 'center', cursor: 'pointer', borderRadius: 1, px: 0.5, py: 0.25, '&:hover': { bgcolor: neutral[50] } }}
              onClick={() => onSelectWorker(worker.employeeId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectWorker(worker.employeeId);
              }}
            >
              <Typography sx={{ fontSize: 12.5, width: 16, color: 'text.secondary', fontWeight: 600 }}>{index + 1}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>{worker.employeeName}</Typography>
                  <Typography sx={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'text.secondary', ml: 1 }}>
                    {formatKg(worker.productionKg)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{worker.teamName}</Typography>
                <Box sx={{ mt: 0.5, height: 6, borderRadius: 999, bgcolor: neutral[100], overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${maxKg > 0 ? Math.max(4, (worker.productionKg / maxKg) * 100) : 0}%`,
                      bgcolor: green[600],
                      borderRadius: 999,
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionPanel>
  );
}
