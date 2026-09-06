import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { useLatexTypes } from '../../../hooks/useLookups';
import { green, neutral } from '../../../theme/colors';
import { useProductionWorkerDetail } from '../hooks/useProductionReport';
import { formatKg, formatShortDate } from '../utils/productionReportFormatters';

export function ProductionWorkerDrawer({
  employeeId,
  filters,
  onClose,
}: {
  employeeId: string | null;
  filters: { fromDate: string; toDate: string };
  onClose: () => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionWorkerDetail(employeeId, filters);
  const { data: latexTypes } = useLatexTypes();
  const latexLabels = Object.fromEntries((latexTypes ?? []).map((t) => [t.code, t.label]));

  return (
    <Drawer anchor="right" open={!!employeeId} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontSize: 16, fontWeight: 700 }}>{data?.employeeName ?? 'Chi tiết công nhân'}</Typography>
            {data && <Typography variant="body2" color="text.secondary">{data.teamName}</Typography>}
          </Box>
          <IconButton onClick={onClose} aria-label="Đóng"><CloseRoundedIcon /></IconButton>
        </Stack>

        {isLoading ? (
          <LoadingSkeleton rows={5} rowHeight={26} />
        ) : isError || !data ? (
          <WidgetErrorState message="Không tải được chi tiết công nhân." onRetry={() => refetch()} />
        ) : (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Tổng sản lượng kỳ</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{formatKg(data.totalKg)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ngày có dữ liệu</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{data.recordedDayCount}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Theo loại mủ</Typography>
              <Stack spacing={0.75}>
                {Object.entries(data.kgByLatexType).map(([code, kg]) => (
                  <Stack key={code} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">{latexLabels[code] ?? code}</Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatKg(kg)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Lịch sử sản lượng theo ngày</Typography>
              {data.dailyTrend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Không có ngày nào có dữ liệu trong kỳ.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data.dailyTrend.map((p) => ({ ...p, label: formatShortDate(p.recordDate) }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: neutral[500] }} axisLine={false} tickLine={false} />
                    <Bar dataKey="totalKg" fill={green[600]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
